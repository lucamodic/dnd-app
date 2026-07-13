import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export type ClassIconDef =
  | { family: "ion"; name: keyof typeof Ionicons.glyphMap }
  | { family: "mdi"; name: keyof typeof MaterialCommunityIcons.glyphMap };

/** Ícono de símbolo por clase (se muestra sobre el color de la clase, en vez de una foto). */
export const CLASS_ICON_DEFS: Record<string, ClassIconDef> = {
  artificer: { family: "mdi", name: "wrench" },
  barbarian: { family: "mdi", name: "axe" },
  bard: { family: "ion", name: "musical-notes" },
  cleric: { family: "ion", name: "medkit" },
  druid: { family: "ion", name: "leaf" },
  fighter: { family: "mdi", name: "sword" },
  monk: { family: "ion", name: "hand-left" },
  paladin: { family: "ion", name: "shield-checkmark" },
  ranger: { family: "mdi", name: "bow-arrow" },
  rogue: { family: "mdi", name: "knife" },
  sorcerer: { family: "ion", name: "flame" },
  warlock: { family: "ion", name: "skull" },
  wizard: { family: "ion", name: "book" },
};

export const classIconDef = (index?: string): ClassIconDef =>
  (index && CLASS_ICON_DEFS[index]) || { family: "ion", name: "shield-half" };
