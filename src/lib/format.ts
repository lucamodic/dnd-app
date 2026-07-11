import { AbilityScores } from "@/api/hooks";

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

export const ABILITY_ORDER: (keyof AbilityScores)[] = ["str", "dex", "con", "int", "wis", "cha"];

export const spellLevelLabel = (level: number): string =>
  level === 0 ? "Truco" : `Nivel ${level}`;

/** Array estándar de D&D 5e para asignar stats al crear (más fácil para principiantes). */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
