import { AbilityScores, Character, Clazz, ClassLevel, ClassResource } from "@/api/hooks";
import { abilityMod } from "./format";

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
  const out: { name: string; description: string; level: number }[] = [];
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
