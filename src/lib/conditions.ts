export type ConditionId =
  | "blinded"
  | "charmed"
  | "deafened"
  | "frightened"
  | "grappled"
  | "incapacitated"
  | "invisible"
  | "paralyzed"
  | "petrified"
  | "poisoned"
  | "prone"
  | "restrained"
  | "stunned"
  | "unconscious"
  | "exhaustion";

export const CONDITION_OPTIONS: { id: ConditionId; label: string; short: string }[] = [
  { id: "blinded", label: "Cegado", short: "No ve; falla pruebas que requieren vista." },
  { id: "charmed", label: "Hechizado", short: "No puede atacar a quien lo hechizó." },
  { id: "deafened", label: "Ensordecido", short: "No oye; falla pruebas que requieren oído." },
  { id: "frightened", label: "Asustado", short: "Desventaja mientras ve la fuente del miedo." },
  { id: "grappled", label: "Agarrado", short: "Velocidad 0." },
  { id: "incapacitated", label: "Incapacitado", short: "No puede tomar acciones ni reacciones." },
  { id: "invisible", label: "Invisible", short: "Difícil de ver sin magia o sentidos especiales." },
  { id: "paralyzed", label: "Paralizado", short: "Incapacitado; no puede moverse ni hablar." },
  { id: "petrified", label: "Petrificado", short: "Convertido en sustancia inerte." },
  { id: "poisoned", label: "Envenenado", short: "Desventaja en ataques y pruebas." },
  { id: "prone", label: "Derribado", short: "Solo puede arrastrarse hasta levantarse." },
  { id: "restrained", label: "Restringido", short: "Velocidad 0; ataques contra él con ventaja." },
  { id: "stunned", label: "Aturdido", short: "Incapacitado; no puede moverse." },
  { id: "unconscious", label: "Inconsciente", short: "Incapacitado, cae derribado y suelta lo que sostiene." },
  { id: "exhaustion", label: "Agotamiento", short: "Tiene niveles acumulables de cansancio extremo." },
];

export const conditionLabel = (id: string) =>
  CONDITION_OPTIONS.find((condition) => condition.id === id)?.label || id;
