/**
 * Armaduras base (espejo del backend src/data/armors.ts) para el modal de CA.
 * computeAc() usa la misma fórmula que el servidor.
 */
export type ArmorCategory = "light" | "medium" | "heavy" | "special";

export interface Armor {
  index: string;
  name: string;
  category: ArmorCategory;
  baseAc: number;
  dexCap: number | null;
  addAbility?: "con" | "wis";
  strMin?: number;
  stealthDisadvantage?: boolean;
  description: string;
}

export const ARMORS: Armor[] = [
  { index: "none", name: "Sin armadura", category: "special", baseAc: 10, dexCap: null, description: "Sin nada puesto: CA = 10 + tu Destreza." },
  { index: "unarmored-barbarian", name: "Defensa sin armadura (Bárbaro)", category: "special", baseAc: 10, dexCap: null, addAbility: "con", description: "Bárbaro sin armadura: CA = 10 + Destreza + Constitución." },
  { index: "unarmored-monk", name: "Defensa sin armadura (Monje)", category: "special", baseAc: 10, dexCap: null, addAbility: "wis", description: "Monje sin armadura ni escudo: CA = 10 + Destreza + Sabiduría." },
  { index: "mage-armor", name: "Armadura de Mago (hechizo)", category: "special", baseAc: 13, dexCap: null, description: "El hechizo Armadura de Mago: CA = 13 + tu Destreza. Dura 8 horas." },
  { index: "padded", name: "Acolchada", category: "light", baseAc: 11, dexCap: null, stealthDisadvantage: true, description: "Ligera. CA = 11 + Destreza. Estorba para el sigilo." },
  { index: "leather", name: "Cuero", category: "light", baseAc: 11, dexCap: null, description: "Ligera. CA = 11 + Destreza." },
  { index: "studded-leather", name: "Cuero Tachonado", category: "light", baseAc: 12, dexCap: null, description: "Ligera. CA = 12 + Destreza. La mejor armadura ligera." },
  { index: "hide", name: "Pieles", category: "medium", baseAc: 12, dexCap: 2, description: "Mediana. CA = 12 + Destreza (máx +2)." },
  { index: "chain-shirt", name: "Camisa de Malla", category: "medium", baseAc: 13, dexCap: 2, description: "Mediana. CA = 13 + Destreza (máx +2)." },
  { index: "scale-mail", name: "Cota de Escamas", category: "medium", baseAc: 14, dexCap: 2, stealthDisadvantage: true, description: "Mediana. CA = 14 + Destreza (máx +2). Estorba el sigilo." },
  { index: "breastplate", name: "Coraza", category: "medium", baseAc: 14, dexCap: 2, description: "Mediana. CA = 14 + Destreza (máx +2)." },
  { index: "half-plate", name: "Media Placa", category: "medium", baseAc: 15, dexCap: 2, stealthDisadvantage: true, description: "Mediana. CA = 15 + Destreza (máx +2). Estorba el sigilo." },
  { index: "ring-mail", name: "Cota de Anillas", category: "heavy", baseAc: 14, dexCap: 0, stealthDisadvantage: true, description: "Pesada. CA = 14 fija. Estorba el sigilo." },
  { index: "chain-mail", name: "Cota de Malla", category: "heavy", baseAc: 16, dexCap: 0, strMin: 13, stealthDisadvantage: true, description: "Pesada. CA = 16 fija. Requiere Fuerza 13. Estorba el sigilo." },
  { index: "splint", name: "Bandas", category: "heavy", baseAc: 17, dexCap: 0, strMin: 15, stealthDisadvantage: true, description: "Pesada. CA = 17 fija. Requiere Fuerza 15. Estorba el sigilo." },
  { index: "plate", name: "Placas", category: "heavy", baseAc: 18, dexCap: 0, strMin: 15, stealthDisadvantage: true, description: "Pesada. CA = 18 fija. La mejor armadura. Requiere Fuerza 15." },
];

export const ARMOR_BY_INDEX: Record<string, Armor> = Object.fromEntries(ARMORS.map((a) => [a.index, a]));

export const ARMOR_CATEGORY_LABEL: Record<ArmorCategory, string> = {
  special: "Especiales",
  light: "Ligeras",
  medium: "Medianas",
  heavy: "Pesadas",
};
