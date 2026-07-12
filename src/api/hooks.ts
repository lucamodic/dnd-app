import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

/* ---------- Tipos (espejo del backend) ---------- */
export interface RaceTrait {
  name: string;
  description: string;
  active: boolean;
}

export interface Race {
  _id: string;
  index: string;
  name: string;
  description: string;
  image: string;
  imageBase64: string;
  size: string;
  speed: number;
  abilityBonuses: { ability: string; bonus: number }[];
  traits: RaceTrait[];
  languages: string;
}

export interface ClassFeature {
  name: string;
  description: string;
  active: boolean;
}

export interface ClassResource {
  key: string;
  label: string;
  value: number;
  trackable: boolean;
  description: string;
}

export interface ClassLevel {
  level: number;
  features: ClassFeature[];
  spellSlots: number[];
  cantripsKnown: number;
  spellsKnown: number;
  resources: ClassResource[];
}

export interface Clazz {
  _id: string;
  index: string;
  name: string;
  color: string;
  hitDie: number;
  primaryAbility: string;
  savingThrows: string[]; // ["str","con"]
  spellcasting: boolean;
  spellcastingAbility: string;
  description: string;
  skillChoiceCount: number;
  skillOptions: string[];
  progression: ClassLevel[];
}

export interface Spell {
  _id: string;
  index: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string[];
  damageType: string;
  savingThrow: string;
  simpleDescription: string;
  dice: string;
  recommended?: boolean; // viene en GET /spells?classId= (para la pantalla de gestionar)
}

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface Currency {
  gp: number;
  sp: number;
  cp: number;
}

export interface ResourceState {
  key: string;
  used: number;
}

export interface UserSummary {
  id?: string;
  _id?: string;
  username: string;
  displayName?: string;
  role: "dm" | "player" | "admin" | "user";
}

export interface InventoryItem {
  _id?: string;
  text: string;
  createdAt?: string;
}

export interface NoteSections {
  general: string;
  campaign: string;
  npcs: string;
  places: string;
  other: string;
}

export interface Character {
  _id: string;
  userId?: UserSummary | string;
  name: string;
  imageBase64: string;
  level: number;
  maxHp: number;
  currentHp: number;
  tempHp: number;
  hitDie: number;
  ac: number;
  proficiencyBonus: number;
  speed: number;
  abilityScores: AbilityScores;
  skillProficiencies: string[];
  currency: Currency;
  spellSlotsUsed: number[];
  resourcesUsed: ResourceState[];
  knownSpells: Spell[];
  armor: string;
  shield: boolean;
  acBonus: number;
  initiativeBonus: number;
  weapon: string;
  inventoryItems: InventoryItem[];
  notes: string;
  noteSections: NoteSections;
  raceId: Race | string;
  classId: Clazz | string;
}

export interface Participant {
  _id: string;
  name: string;
  type: "player" | "monster";
  initiative: number;
  hp?: number;
  tempHp?: number;
  maxHp?: number;
  ac: number;
  characterId?: string;
  ownerUserId?: string;
  color?: string;
}

export interface Tracker {
  _id: string;
  round: number;
  activeIndex: number;
  participants: Participant[];
}

export interface Monster {
  _id: string;
  name: string;
  hp: number;
  ac: number;
  challengeRating: number;
  type: string;
}

/* ---------- Catálogo ---------- */
export const useRaces = () => useQuery({ queryKey: ["races"], queryFn: () => api<Race[]>("/races") });
export const useClasses = () => useQuery({ queryKey: ["classes"], queryFn: () => api<Clazz[]>("/classes") });

export const useClassSpells = (classId?: string) =>
  useQuery({
    queryKey: ["spells", classId],
    queryFn: () => api<Spell[]>(`/spells?classId=${classId}`),
    enabled: !!classId,
  });

export const useMonsters = (search: string) =>
  useQuery({
    queryKey: ["monsters", search],
    queryFn: () => api<Monster[]>(`/monsters?search=${encodeURIComponent(search)}`),
  });

/* ---------- Personajes ---------- */
export const useCharacters = () =>
  useQuery({ queryKey: ["characters"], queryFn: () => api<Character[]>("/characters") });

export const useCharacter = (id: string) =>
  useQuery({ queryKey: ["character", id], queryFn: () => api<Character>(`/characters/${id}`), enabled: !!id });

/** PATCH genérico del personaje (monedas, skills, slots, recursos...). Update optimista. */
export const useUpdateCharacter = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Character>) => api<Character>(`/characters/${id}`, { method: "PATCH", body: patch }),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["character", id] });
      const prev = qc.getQueryData<Character>(["character", id]);
      // `knownSpells` se manda como array de ids (string) al backend, pero en cache son objetos
      // Spell populados. No lo mezclamos optimistamente para no romper la forma; onSettled refetchea.
      const { knownSpells, ...optimisticPatch } = patch;
      if (prev) qc.setQueryData<Character>(["character", id], { ...prev, ...optimisticPatch });
      return { prev };
    },
    onError: (_e, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(["character", id], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["character", id] });
      qc.invalidateQueries({ queryKey: ["characters"] });
      qc.invalidateQueries({ queryKey: ["tracker"] });
    },
  });
};

export const useCreateCharacter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; raceId: string; classId: string; abilityScores?: Partial<AbilityScores> }) =>
      api<Character>("/characters", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["characters"] }),
  });
};

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { username: string; password: string; displayName?: string }) =>
      api<UserSummary>("/auth/users", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["characters"] }),
  });
};

/** Tira características para una clase (4d6 drop lowest, repartidas por clase). */
export const useRollStats = () =>
  useMutation({
    mutationFn: (classId: string) => api<AbilityScores>("/characters/roll-stats", { method: "POST", body: { classId } }),
  });

export const useLevelUp = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rolled?: number) =>
      api<{ character: Character; roll: number; conMod: number; gained: number }>(`/characters/${id}/level-up`, {
        method: "POST",
        body: { rolled },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["character", id] });
      qc.invalidateQueries({ queryKey: ["characters"] });
    },
  });
};

export const useSetHp = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (currentHp: number) => api<Character>(`/characters/${id}/hp`, { method: "POST", body: { currentHp } }),
    onSuccess: (data) => {
      qc.setQueryData<Character>(["character", id], (prev) => (prev ? { ...prev, currentHp: data.currentHp } : prev));
      qc.invalidateQueries({ queryKey: ["characters"] });
      qc.invalidateQueries({ queryKey: ["tracker"] });
    },
  });
};

export const useDeleteCharacter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/characters/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["characters"] });
      qc.invalidateQueries({ queryKey: ["tracker"] });
    },
  });
};

/* ---------- Turn Tracker (polling) ---------- */
export const useTracker = (enabled = true) =>
  useQuery({
    queryKey: ["tracker"],
    queryFn: () => api<Tracker>("/tracker"),
    refetchInterval: enabled ? 3000 : false,
    enabled,
  });

const trackerMutation =
  <TVars,>(fn: (vars: TVars) => Promise<unknown>) =>
  () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: fn,
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["tracker"] });
        qc.invalidateQueries({ queryKey: ["characters"] });
        qc.invalidateQueries({ queryKey: ["character"] });
      },
    });
  };

export const useTrackerJoin = trackerMutation<{ characterId: string; initiative: number }>((v) =>
  api("/tracker/join", { method: "POST", body: v })
);
export const useTrackerAddMonster = trackerMutation<{
  monsterId?: string;
  name?: string;
  hp?: number;
  ac?: number;
  initiative?: number;
}>((v) => api("/tracker/participants", { method: "POST", body: v }));
export const useTrackerPatch = trackerMutation<{ pid: string; hp?: number; tempHp?: number; initiative?: number }>(({ pid, ...body }) =>
  api(`/tracker/participants/${pid}`, { method: "PATCH", body })
);
export const useTrackerRemove = trackerMutation<string>((pid) =>
  api(`/tracker/participants/${pid}`, { method: "DELETE" })
);
export const useTrackerNext = trackerMutation<void>(() => api("/tracker/next", { method: "POST" }));
export const useTrackerSort = trackerMutation<void>(() => api("/tracker/sort", { method: "POST" }));
export const useTrackerReset = trackerMutation<void>(() => api("/tracker/reset", { method: "POST", body: {} }));
