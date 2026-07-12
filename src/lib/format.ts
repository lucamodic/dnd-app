import { AbilityScores, Clazz } from "@/api/hooks";

export const abilityMod = (score: number): number => Math.floor((score - 10) / 2);

export const formatMod = (mod: number): string => (mod >= 0 ? `+${mod}` : `${mod}`);

export const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  str: "FUE",
  dex: "DES",
  con: "CON",
  int: "INT",
  wis: "SAB",
  cha: "CAR",
};

export const ABILITY_FULL: Record<keyof AbilityScores, string> = {
  str: "Fuerza",
  dex: "Destreza",
  con: "Constitución",
  int: "Inteligencia",
  wis: "Sabiduría",
  cha: "Carisma",
};

export const ABILITY_DESCRIPTIONS: Record<keyof AbilityScores, string> = {
  str: "Fuerza mide potencia física: levantar, empujar, romper, trepar, agarrar y pegar fuerte con armas cuerpo a cuerpo pesadas o normales.",
  dex: "Destreza mide agilidad y precisión: esquivar, moverte rápido, hacer equilibrio, ser sigiloso, usar las manos con cuidado y atacar con armas a distancia o sutiles.",
  con: "Constitución mide aguante físico: resistir venenos, cansancio, golpes, enfermedades y mantenerte de pie cuando el cuerpo está al límite.",
  int: "Inteligencia mide conocimiento y razonamiento: recordar historia, entender magia, investigar pistas, analizar símbolos y resolver problemas con estudio.",
  wis: "Sabiduría mide percepción e instinto: notar peligros, leer intenciones, orientarte, sobrevivir en la naturaleza y actuar con sentido común.",
  cha: "Carisma mide presencia y fuerza de personalidad: convencer, intimidar, engañar, inspirar y canalizar magia basada en voluntad o poder personal.",
};

export const ABILITY_ORDER: (keyof AbilityScores)[] = ["str", "dex", "con", "int", "wis", "cha"];

export const CONCENTRATION_INFO = {
  title: "Concentración",
  body: "Algunos hechizos se mantienen activos mientras te concentrás. Solo podés concentrarte en un hechizo a la vez: si lanzás otro de concentración, se corta el anterior. Si recibís daño, normalmente tirás para no perderlo.",
};

export const spellLevelLabel = (level: number): string =>
  level === 0 ? "Truco" : `Nivel ${level}`;

const normalizeAbilityText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const classHighlightsAbility = (cls: Clazz | null | undefined, ability: keyof AbilityScores): boolean => {
  if (!cls) return false;
  if (cls.savingThrows?.includes(ability)) return true;
  const primary = normalizeAbilityText(cls.primaryAbility || "");
  return primary.includes(normalizeAbilityText(ABILITY_FULL[ability]));
};

/** Array estándar de D&D 5e para asignar stats al crear (más fácil para principiantes). */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
