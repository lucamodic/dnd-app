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
  flexibleAbilityBonuses?: boolean;
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
  spellListClassId?: string;
  description: string;
  subclassLevel: number;
  skillChoiceCount: number;
  skillOptions: string[];
  abilityPriority: string[];
  progression: ClassLevel[];
}

export interface SubclassLevel {
  level: number;
  features: ClassFeature[];
  spellSlots?: number[];
  cantripsKnown?: number;
  spellsKnown?: number;
  resources?: ClassResource[];
}

export interface Subclass {
  _id: string;
  index: string;
  classIndex: string;
  name: string;
  description: string;
  subclassLevel: number;
  source?: string;
  spellcasting?: boolean;
  spellcastingAbility?: string;
  spellListClassIndex?: string;
  progression: SubclassLevel[];
  bonusSpells?: { level: number; spellIndexes: string[] }[];
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
  higherLevel?: string[];
  damageType: string;
  savingThrow: string;
  /** "melee" | "ranged" si pide tirada de ataque de conjuro; "" si impacta solo o pide salvación. */
  attackType?: string;
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

export type WeaponCategory = "simple-melee" | "simple-ranged" | "martial-melee" | "martial-ranged";

export interface Weapon {
  _id?: string;
  index: string;
  name: string;
  category: WeaponCategory;
  damageDice: string;
  damageType: string;
  properties: string[];
  description: string;
  custom?: boolean;
  /** Bono mágico (+0 a +3); suma a ataque y daño. Solo el DM la carga al crear el arma. */
  bonus?: number;
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
  description?: string;
  createdAt?: string;
}

export interface NoteSections {
  characterInfo?: string;
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
  ac?: number;
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
  weapons: string[];
  hitDiceUsed: number;
  inventoryItems: InventoryItem[];
  notes: string;
  noteSections: NoteSections;
  deathSaves: { successes: number; failures: number };
  raging?: boolean;
  concentratingSpell?: string;
  raceId: Race | string;
  classId: Clazz | string;
  subclassIndex: string;
  subclassName?: string;
  subclassBonusSpells?: Spell[];
  /** Estilo de combate elegido (solo guerrero por ahora, "" si no eligió todavía). */
  fightingStyle: string;
  fightingStyleName?: string;
  fightingStyleDescription?: string;
  /** Subconjunto de `knownSpells` preparado hoy. Vacío = todavía no eligió (ver `preparedOrAll`). */
  preparedSpells: Spell[];
  backgroundIndex: string;
  /** El trasfondo completo, resuelto por el backend al leer el personaje. */
  background?: Background | null;
  /** Hechizos elegidos de los `spellChoices` del trasfondo. */
  backgroundSpells: Spell[];
  /** Gratis: los fijos del trasfondo + los elegidos. No cuentan contra los límites. */
  backgroundBonusSpells?: Spell[];
  /** Se suman a la lista de la clase: se eligen normal y SÍ cuentan al límite. */
  backgroundExtraSpells?: Spell[];
  /** Opciones de los `spellChoices` del trasfondo, ya resueltas a hechizos. */
  backgroundSpellOptions?: BackgroundSpellOption[];
}

export interface BackgroundFeature {
  name: string;
  description: string;
  active: boolean;
}

/** Hechizos gratis que el trasfondo deja elegir. No cuentan contra los límites del personaje. */
export interface BackgroundSpellChoice {
  key: string;
  label: string;
  spellLevel: number; // 0 = truco
  count: number;
  options: string[]; // índices de hechizo concretos
  optionsFromClass: string[]; // índices de clase de cuya lista se puede elegir
}

/** Una elección de hechizo de trasfondo ya resuelta a hechizos concretos por el backend. */
export interface BackgroundSpellOption {
  key: string;
  label: string;
  spellLevel: number;
  count: number;
  spells: Spell[];
}

export interface Background {
  _id: string;
  index: string;
  name: string;
  nameEn: string;
  source: string;
  url: string;
  category: string;
  variantOf: string;
  description: string;
  skillProficiencies: string[];
  skillProficienciesNote: string;
  toolProficiencies: string;
  languages: string;
  equipment: string;
  features: BackgroundFeature[];
  bonusSpells: { level: number; spellIndexes: string[] }[];
  spellChoices: BackgroundSpellChoice[];
  extraSpellList: string[];
}

export interface FightingStyle {
  index: string;
  name: string;
  description: string;
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
  conditions?: string[];
  characterId?: string;
  ownerUserId?: string;
  color?: string;
}

export interface Tracker {
  _id: string;
  round: number;
  activeIndex: number;
  levelUpEnabled: boolean;
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

const catalogQueryOptions = {
  staleTime: 24 * 60 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000,
  placeholderData: <T,>(previousData: T | undefined) => previousData,
};

/* ---------- Catálogo ---------- */
export const useRaces = () =>
  useQuery({ queryKey: ["races"], queryFn: () => api<Race[]>("/races"), ...catalogQueryOptions });
export const useClasses = () =>
  useQuery({ queryKey: ["classes"], queryFn: () => api<Clazz[]>("/classes"), ...catalogQueryOptions });

export const useSubclasses = (classIndex?: string) =>
  useQuery({
    queryKey: ["subclasses", classIndex],
    queryFn: () => api<Subclass[]>(`/subclasses?classIndex=${classIndex}`),
    enabled: !!classIndex,
    ...catalogQueryOptions,
  });

export const useClassSpells = (classId?: string) =>
  useQuery({
    queryKey: ["spells", classId],
    queryFn: () => api<Spell[]>(`/spells?classId=${classId}`),
    enabled: !!classId,
    ...catalogQueryOptions,
  });

export const useMonsters = (search: string) =>
  useQuery({
    queryKey: ["monsters", search],
    queryFn: () => api<Monster[]>(`/monsters?search=${encodeURIComponent(search)}`),
    ...catalogQueryOptions,
  });

export const useBackgrounds = () =>
  useQuery({ queryKey: ["backgrounds"], queryFn: () => api<Background[]>("/backgrounds"), ...catalogQueryOptions });

export const useFightingStyles = () =>
  useQuery({
    queryKey: ["fighting-styles"],
    queryFn: () => api<FightingStyle[]>("/fighting-styles"),
    ...catalogQueryOptions,
  });

export const useWeapons = () =>
  useQuery({ queryKey: ["weapons"], queryFn: () => api<Weapon[]>("/weapons"), ...catalogQueryOptions });

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
      const optimisticPatch = { ...patch };
      // knownSpells/preparedSpells/backgroundSpells viajan como string[] pero el cache guarda
      // objetos Spell: hay que rehidratarlos o la ficha crashea al leer `._id`.
      const spellIdFields = ["knownSpells", "preparedSpells", "backgroundSpells"] as const;
      if (prev && spellIdFields.some((field) => Array.isArray(patch[field]))) {
        const catalog = qc
          .getQueriesData<Spell[]>({ queryKey: ["spells"] })
          .flatMap(([, list]) => list || []);
        const byId = new Map<string, Spell>();
        const known = spellIdFields.flatMap((field) => prev[field] || []);
        for (const spell of [...catalog, ...known]) {
          if (spell && typeof spell === "object") byId.set(spell._id, spell);
        }
        for (const field of spellIdFields) {
          if (!Array.isArray(patch[field])) continue;
          optimisticPatch[field] = (patch[field] as unknown as string[])
            .map((spellId) => byId.get(spellId))
            .filter((spell): spell is Spell => !!spell);
        }
      }
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
    mutationFn: (body: {
      name: string;
      raceId: string;
      classId: string;
      subclassIndex?: string;
      backgroundIndex?: string;
      fightingStyle?: string;
      abilityScores?: Partial<AbilityScores>;
    }) =>
      api<Character>("/characters", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["characters"] }),
  });
};

export const useChooseSubclass = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subclassIndex: string) =>
      api<Character>(`/characters/${id}/subclass`, { method: "POST", body: { subclassIndex } }),
    onSuccess: (character) => {
      qc.invalidateQueries({ queryKey: ["characters"] });
      qc.invalidateQueries({ queryKey: ["character", character._id] });
    },
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

export const useCreateWeapon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      category: WeaponCategory;
      damageDice?: string;
      damageType?: string;
      properties?: string[];
      description?: string;
      bonus?: number;
    }) => api<Weapon>("/weapons", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weapons"] }),
  });
};

export const useAssignWeapon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ characterId, weaponIndex }: { characterId: string; weaponIndex: string }) =>
      api<Character>(`/weapons/assign/${characterId}`, { method: "POST", body: { weaponIndex } }),
    onSuccess: (character) => {
      qc.invalidateQueries({ queryKey: ["weapons"] });
      qc.invalidateQueries({ queryKey: ["characters"] });
      qc.invalidateQueries({ queryKey: ["character", character._id] });
    },
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

/** Descanso largo: vida al máximo, recursos/hechizos y dados de golpe recuperados. */
export const useFullRest = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<Character>(`/characters/${id}/full-rest`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["character", id] });
      qc.invalidateQueries({ queryKey: ["characters"] });
      qc.invalidateQueries({ queryKey: ["tracker"] });
    },
  });
};

/** Descanso corto: gasta N dados de golpe (tirados en la app o a mano) y cura roll+CON por dado. */
export const useShortRest = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rolls: number[]) =>
      api<{ character: Character; healed: number }>(`/characters/${id}/short-rest`, {
        method: "POST",
        body: { rolls },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["character", id] });
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
export const useTrackerPatch = trackerMutation<{ pid: string; hp?: number; tempHp?: number; initiative?: number; conditions?: string[] }>(({ pid, ...body }) =>
  api(`/tracker/participants/${pid}`, { method: "PATCH", body })
);
export const useTrackerSettings = trackerMutation<{ levelUpEnabled?: boolean }>((body) =>
  api("/tracker", { method: "PATCH", body })
);
export const useTrackerRemove = trackerMutation<string>((pid) =>
  api(`/tracker/participants/${pid}`, { method: "DELETE" })
);
export const useTrackerNext = trackerMutation<void>(() => api("/tracker/next", { method: "POST" }));
export const useTrackerSort = trackerMutation<void>(() => api("/tracker/sort", { method: "POST" }));
export const useTrackerReset = trackerMutation<void>(() => api("/tracker/reset", { method: "POST", body: {} }));
