/** Display value for controlled number inputs in the questionnaire. */
export function formatNumberFieldValue(
  value: number | undefined | null,
): string {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

/** Parse raw `<input type="number">` text; incomplete edits return undefined. */
export function parseQuestionnaireNumberInput(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-") {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function isIncompleteNumberInput(raw: string): boolean {
  return raw === "" || raw === "-" || raw.endsWith(".");
}

export type QuestionNumberLimits = {
  min?: number;
  max?: number;
};

export function readQuestionNumberLimits(
  validation: unknown,
): QuestionNumberLimits {
  if (
    validation &&
    typeof validation === "object" &&
    !Array.isArray(validation)
  ) {
    const record = validation as Record<string, unknown>;
    return {
      min: typeof record.min === "number" ? record.min : undefined,
      max: typeof record.max === "number" ? record.max : undefined,
    };
  }
  return {};
}
