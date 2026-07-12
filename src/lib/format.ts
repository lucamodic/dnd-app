import { AbilityScores, Clazz, Race } from "@/api/hooks";

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

/**
 * Solo destacamos las salvaciones en las que la clase es realmente competente (2 por clase,
 * regla oficial). Antes tambi\u00e9n destacaba `primaryAbility` (texto libre tipo "Fuerza o
 * Destreza"), pero eso hac\u00eda que clases con caracter\u00edstica principal flexible (Guerrero,
 * Monje, Explorador...) mostraran 3 caracter\u00edsticas marcadas como si fueran todas
 * "proficientes", lo cual confund\u00eda. `primaryAbility` sigue mostr\u00e1ndose como texto aparte.
 */
export const classHighlightsAbility = (cls: Clazz | null | undefined, ability: keyof AbilityScores): boolean => {
  if (!cls) return false;
  return !!cls.savingThrows?.includes(ability);
};

/** Array estándar de D&D 5e para asignar stats al crear (más fácil para principiantes). */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export interface RaceBonusPreview {
  ability: keyof AbilityScores;
  bonus: number;
  note?: string;
}

/**
 * Previsualiza dónde va a caer el bono racial ANTES de crear el personaje, para mostrarlo en el
 * wizard. Para razas de bono fijo, es directo. Para razas MPMM (+2/+1 flexible), replica la misma
 * lógica cap-aware del backend (`pickFlexibleRaceBonusTargets` en dndRules.ts): preferimos poner
 * el +2 en la primera característica de la prioridad de la clase que no vaya a "desperdiciarse"
 * contra el tope de 20.
 */
export function raceAbilityBonusPreview(
  race: Race | null | undefined,
  cls: Clazz | null | undefined,
  baseScores: AbilityScores | null | undefined
): RaceBonusPreview[] {
  if (!race || !baseScores) return [];

  if (!race.flexibleAbilityBonuses) {
    return (race.abilityBonuses || []).map((b) => ({ ability: b.ability as keyof AbilityScores, bonus: b.bonus }));
  }

  const priority = ((cls?.abilityPriority?.length ? cls.abilityPriority : ABILITY_ORDER) as string[]).filter(
    (a, i, arr) => arr.indexOf(a) === i
  ) as (keyof AbilityScores)[];
  const value = (a: keyof AbilityScores) => baseScores[a] ?? 10;

  const plusTwo = priority.find((a) => value(a) <= 18) || priority[0] || "str";
  const plusOne = priority.find((a) => a !== plusTwo && value(a) <= 19) || priority.find((a) => a !== plusTwo) || "con";

  const wasted = value(plusTwo) >= 19;
  return [
    {
      ability: plusTwo,
      bonus: 2,
      note: wasted
        ? `Ya tenés ${value(plusTwo)}, así que parte del +2 se pierde por el tope de 20.`
        : `Te conviene acá: te queda en ${Math.min(20, value(plusTwo) + 2)}.`,
    },
    { ability: plusOne, bonus: 1 },
  ];
}
