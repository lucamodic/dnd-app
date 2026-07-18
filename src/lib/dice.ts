/**
 * Parseo y tirada de dados en notación estándar de D&D.
 * Soporta "2d8", "1d6+3", "3d6 + 1d4", "d20", etc.
 */
export interface DiceTerm {
  count: number;
  sides: number;
}

export interface ParsedDice {
  terms: DiceTerm[];
  modifier: number;
  notation: string;
}

const TERM_RE = /([+-]?)\s*(\d*)d(\d+)/gi;
const FLAT_RE = /([+-])\s*(\d+)(?!d)/gi;

export function parseDice(input: string): ParsedDice | null {
  if (!input) return null;
  const clean = input.toLowerCase().replace(/\s+/g, " ").trim();
  const terms: DiceTerm[] = [];
  let modifier = 0;
  let matched = false;

  let m: RegExpExecArray | null;
  TERM_RE.lastIndex = 0;
  while ((m = TERM_RE.exec(clean)) !== null) {
    matched = true;
    const sign = m[1] === "-" ? -1 : 1;
    const count = (parseInt(m[2] || "1", 10) || 1) * sign;
    const sides = parseInt(m[3], 10);
    if (sides > 0) terms.push({ count, sides });
  }

  // Modificadores planos (ej "+3") que no sean parte de un dado.
  const withoutDice = clean.replace(TERM_RE, " ");
  FLAT_RE.lastIndex = 0;
  while ((m = FLAT_RE.exec(withoutDice)) !== null) {
    modifier += (m[1] === "-" ? -1 : 1) * parseInt(m[2], 10);
  }

  if (!matched) return null;
  return { terms, modifier, notation: input };
}

export interface RollResult {
  rolls: { sides: number; value: number; discarded?: boolean }[];
  modifier: number;
  total: number;
  notation: string;
  /** Solo se completa en tiradas de un solo d20 (ataque/salvación/skill/check). */
  nat20?: boolean;
  nat1?: boolean;
}

export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDice(parsed: ParsedDice): RollResult {
  const rolls: { sides: number; value: number }[] = [];
  let total = parsed.modifier;

  for (const term of parsed.terms) {
    const n = Math.abs(term.count);
    const sign = term.count < 0 ? -1 : 1;
    for (let i = 0; i < n; i++) {
      const value = rollDie(term.sides);
      rolls.push({ sides: term.sides, value });
      total += value * sign;
    }
  }

  return { rolls, modifier: parsed.modifier, total, notation: parsed.notation };
}

export function rollNotation(notation: string): RollResult | null {
  const parsed = parseDice(notation);
  return parsed ? rollDice(parsed) : null;
}

export type RollMode = "normal" | "advantage" | "disadvantage";

/** Tira un d20 + modificador. Con ventaja/desventaja tira 2d20 y descarta el que no aplica. */
export function rollD20(modifier: number, mode: RollMode = "normal"): RollResult {
  const notation = modifier ? `1d20${modifier >= 0 ? "+" : ""}${modifier}` : "1d20";
  const a = rollDie(20);

  if (mode === "normal") {
    return {
      rolls: [{ sides: 20, value: a }],
      modifier,
      total: a + modifier,
      notation,
      nat20: a === 20,
      nat1: a === 1,
    };
  }

  const b = rollDie(20);
  const keep = mode === "advantage" ? Math.max(a, b) : Math.min(a, b);
  const aIsKept = a === keep;
  const rolls = aIsKept
    ? [{ sides: 20, value: a }, { sides: 20, value: b, discarded: true }]
    : [{ sides: 20, value: b }, { sides: 20, value: a, discarded: true }];

  return {
    rolls,
    modifier,
    total: keep + modifier,
    notation,
    nat20: keep === 20,
    nat1: keep === 1,
  };
}

/**
 * Tira una notación ya parseada, aplicando ventaja/desventaja SOLO si es un d20 puro (sin dados
 * extra). Para el resto de notaciones (daño, tiradas de vida, etc.) ignora el modo y tira normal,
 * pero igual marca `nat20`/`nat1` si resulta ser un único d20.
 */
export function rollWithMode(parsed: ParsedDice, mode: RollMode = "normal"): RollResult {
  const isSingleD20 = parsed.terms.length === 1 && parsed.terms[0].count === 1 && parsed.terms[0].sides === 20;
  if (mode !== "normal" && isSingleD20) {
    return rollD20(parsed.modifier, mode);
  }
  const result = rollDice(parsed);
  if (isSingleD20) {
    return { ...result, nat20: result.rolls[0]?.value === 20, nat1: result.rolls[0]?.value === 1 };
  }
  return result;
}

/**
 * Crítico homebrew: duplica la CANTIDAD de cada dado Y el modificador plano (no solo los dados,
 * como en la regla oficial). Ej: "1d4+4" -> "2d4+8"; "2d6+3" -> "4d6+6".
 */
export function doubleForCrit(notation: string): string {
  const parsed = parseDice(notation);
  if (!parsed) return notation;

  const parts: string[] = [];
  parsed.terms.forEach((term, i) => {
    const count = term.count * 2;
    const sign = count >= 0 && i > 0 ? "+" : "";
    parts.push(`${sign}${count}d${term.sides}`);
  });

  const doubledModifier = parsed.modifier * 2;
  if (doubledModifier !== 0) {
    parts.push(doubledModifier > 0 ? `+${doubledModifier}` : `${doubledModifier}`);
  }

  return parts.join("") || notation;
}
