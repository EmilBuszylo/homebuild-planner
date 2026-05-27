export type ModifierKind = "percent" | "per_unit" | "flat";

export type ParsedModifierTag =
  | { kind: "percent"; percent: number }
  | { kind: "per_unit"; unitSlug: string }
  | { kind: "flat" };

const PERCENT_PREFIX = /^\[PERCENT:(\d+)\]/;
const PER_UNIT_PREFIX = /^\[PER_UNIT:([^\]]+)\]/;

export function parseModifierDescription(
  description: string | null | undefined,
): ParsedModifierTag {
  if (!description) {
    return { kind: "flat" };
  }

  const percentMatch = description.match(PERCENT_PREFIX);
  if (percentMatch) {
    return { kind: "percent", percent: Number(percentMatch[1]) };
  }

  const perUnitMatch = description.match(PER_UNIT_PREFIX);
  if (perUnitMatch) {
    return { kind: "per_unit", unitSlug: perUnitMatch[1] };
  }

  return { kind: "flat" };
}
