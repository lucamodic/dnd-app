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
  rolls: { sides: number; value: number }[];
  modifier: number;
  total: number;
  notation: string;
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
