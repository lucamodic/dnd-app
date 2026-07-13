import { AbilityScores, Character, Clazz, ClassLevel, ClassResource } from "@/api/hooks";
import { abilityMod } from "./format";
import { ARMOR_BY_INDEX } from "@/data/armors";
import { Weapon } from "@/data/weapons";

/** Las 18 competencias con su característica (espejo del backend src/data/skills.ts). */
export interface SkillDef {
  index: string;
  label: string;
  ability: keyof AbilityScores;
}

export const SKILLS: SkillDef[] = [
  { index: "acrobatics", label: "Acrobacias", ability: "dex" },
  { index: "animal-handling", label: "Trato con Animales", ability: "wis" },
  { index: "arcana", label: "Arcanos", ability: "int" },
  { index: "athletics", label: "Atletismo", ability: "str" },
  { index: "deception", label: "Engaño", ability: "cha" },
  { index: "history", label: "Historia", ability: "int" },
  { index: "insight", label: "Perspicacia", ability: "wis" },
  { index: "intimidation", label: "Intimidación", ability: "cha" },
  { index: "investigation", label: "Investigación", ability: "int" },
  { index: "medicine", label: "Medicina", ability: "wis" },
  { index: "nature", label: "Naturaleza", ability: "int" },
  { index: "perception", label: "Percepción", ability: "wis" },
  { index: "performance", label: "Interpretación", ability: "cha" },
  { index: "persuasion", label: "Persuasión", ability: "cha" },
  { index: "religion", label: "Religión", ability: "int" },
  { index: "sleight-of-hand", label: "Juego de Manos", ability: "dex" },
  { index: "stealth", label: "Sigilo", ability: "dex" },
  { index: "survival", label: "Supervivencia", ability: "wis" },
];

/** El bloque de progresión de la clase para un nivel dado (1-based). */
export function progressionAt(cls: Clazz, level: number): ClassLevel | undefined {
  return cls.progression?.find((p) => p.level === level);
}

/** Cantidad de recursos (rastreables o informativos) que tiene la clase a ese nivel. */
export function resourcesCount(cls: Clazz, level: number): number {
  return progressionAt(cls, level)?.resources.length || 0;
}

/** Todas las habilidades de clase desbloqueadas hasta cierto nivel (acumulado). */
export function featuresUpTo(cls: Clazz, level: number) {
  const out: { name: string; description: string; active: boolean; level: number }[] = [];
  for (const p of cls.progression || []) {
    if (p.level > level) break;
    for (const f of p.features) out.push({ ...f, level: p.level });
  }
  return out;
}

/** Modificador de una competencia = mod de característica + (competente ? bono : 0). */
export function skillModifier(skill: SkillDef, character: Character): number {
  const base = abilityMod(character.abilityScores[skill.ability]);
  const proficient = character.skillProficiencies?.includes(skill.index);
  return base + (proficient ? character.proficiencyBonus : 0);
}

/** Modificador de una salvación = mod + (la clase es competente en esa característica ? bono : 0). */
export function saveModifier(ability: keyof AbilityScores, character: Character, cls: Clazz): number {
  const base = abilityMod(character.abilityScores[ability]);
  const proficient = cls.savingThrows?.includes(ability);
  return base + (proficient ? character.proficiencyBonus : 0);
}

/** Espacios de conjuro del nivel actual como pips (nivel de conjuro -> {max, used}). */
export function spellSlotsAt(cls: Clazz, character: Character) {
  const prog = progressionAt(cls, character.level);
  const slots = prog?.spellSlots || [];
  return slots
    .map((max, i) => ({ spellLevel: i + 1, max, used: character.spellSlotsUsed?.[i] || 0 }))
    .filter((s) => s.max > 0);
}

/** Recursos del nivel actual, mezclando el máximo (clase) con lo usado (personaje). */
export function resourcesAt(cls: Clazz, character: Character): (ClassResource & { used: number })[] {
  const prog = progressionAt(cls, character.level);
  return (prog?.resources || []).map((r) => ({
    ...r,
    used: character.resourcesUsed?.find((u) => u.key === r.key)?.used || 0,
  }));
}

/** Setea "usado" para un recurso concreto, devolviendo el array completo actualizado. */
export function setResourceUsed(character: Character, key: string, used: number): { key: string; used: number }[] {
  const existing = character.resourcesUsed || [];
  const found = existing.find((r) => r.key === key);
  if (found) return existing.map((r) => (r.key === key ? { ...r, used } : r));
  return [...existing, { key, used }];
}

/** Setea "usado" para un nivel de conjuro, devolviendo el array completo (largo 9). */
export function setSpellSlotUsed(character: Character, spellLevelIndex: number, used: number): number[] {
  const arr = [...(character.spellSlotsUsed || [])];
  while (arr.length < 9) arr.push(0);
  arr[spellLevelIndex] = used;
  return arr;
}

/** Mayor nivel de conjuro desbloqueado a este nivel (0 = solo trucos; -1 = no lanza conjuros). */
export function maxUnlockedSpellLevel(cls: Clazz, level: number): number {
  if (!cls.spellcasting) return -1;
  const prog = progressionAt(cls, level);
  const slots = prog?.spellSlots || [];
  let max = 0; // los trucos (nivel 0) siempre están si la clase lanza conjuros
  slots.forEach((n, i) => {
    if (n > 0) max = i + 1;
  });
  return max;
}

/** Cuántos trucos (hechizos de nivel 0) puede tener conocidos a este nivel. */
export function cantripLimit(cls: Clazz, level: number): number {
  return progressionAt(cls, level)?.cantripsKnown || 0;
}

/**
 * Cuántos hechizos (sin contar trucos) puede tener conocidos/preparados a este nivel.
 * Clases "de conocidos" (bardo, explorador, hechicero, brujo) usan el número fijo del SRD.
 * Clases "de preparados" (clérigo, druida, mago, paladín, artificiero) no tienen ese número en
 * el SRD (preparan de toda su lista); usamos la fórmula oficial: mod. de característica + nivel
 * (mitad redondeada hacia abajo para paladín y artificiero, que son semi-lanzadores).
 */
export function spellsKnownLimit(cls: Clazz, character: Character, level: number): number {
  const known = progressionAt(cls, level)?.spellsKnown || 0;
  if (known > 0) return known;
  if (!cls.spellcastingAbility) return 0;
  const abilityKey = cls.spellcastingAbility as keyof AbilityScores;
  const mod = abilityMod(character.abilityScores[abilityKey]);
  const effectiveLevel = ["paladin", "artificer"].includes(cls.index) ? Math.floor(level / 2) : level;
  return Math.max(1, mod + effectiveLevel);
}

/** CA calculada (misma fórmula que el backend): armadura + Destreza (según tope) + escudo + bonus. */
export function computeAc(character: Character): number {
  const armor = ARMOR_BY_INDEX[character.armor] || ARMOR_BY_INDEX["none"];
  const dexMod = abilityMod(character.abilityScores.dex);
  const cappedDex = armor.dexCap === null ? dexMod : Math.min(dexMod, armor.dexCap);
  let ac = armor.baseAc + cappedDex;
  if (armor.addAbility) ac += abilityMod(character.abilityScores[armor.addAbility]);
  if (character.shield) ac += 2;
  ac += character.acBonus || 0;
  return ac;
}

/** DC de salvación de conjuros = 8 + competencia + mod de la característica mágica de la clase. */
export function spellSaveDC(character: Character, cls: Clazz): number | null {
  if (!cls.spellcasting || !cls.spellcastingAbility) return null;
  const abilityKey = cls.spellcastingAbility as keyof AbilityScores;
  return 8 + character.proficiencyBonus + abilityMod(character.abilityScores[abilityKey]);
}

/** Bonificador de ataque con conjuros = competencia + mod de la característica mágica. */
export function spellAttackBonus(character: Character, cls: Clazz): number | null {
  if (!cls.spellcasting || !cls.spellcastingAbility) return null;
  const abilityKey = cls.spellcastingAbility as keyof AbilityScores;
  return character.proficiencyBonus + abilityMod(character.abilityScores[abilityKey]);
}

/** Atributo y bonus de ataque/daño de arma según reglas base de D&D. */
export function weaponAttackInfo(character: Character, weapon: Weapon) {
  const isRanged = weapon.category.endsWith("ranged");
  const isFinesse = weapon.properties.includes("Sutileza");
  const strMod = abilityMod(character.abilityScores.str);
  const dexMod = abilityMod(character.abilityScores.dex);
  const ability: keyof AbilityScores = isFinesse ? (dexMod > strMod ? "dex" : "str") : isRanged ? "dex" : "str";
  const abilityLabel = ability === "dex" ? "Destreza" : "Fuerza";
  const abilityBonus = abilityMod(character.abilityScores[ability]);

  return {
    ability,
    abilityLabel,
    abilityBonus,
    attackBonus: abilityBonus + character.proficiencyBonus,
  };
}

/** Iniciativa = mod de Destreza + bonus del personaje. */
export function initiative(character: Character): number {
  return abilityMod(character.abilityScores.dex) + (character.initiativeBonus || 0);
}
