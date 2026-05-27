const CATEGORY_LABELS: Record<string, string> = {
  STRUCTURE: "Konstrukcja",
  INSTALLATIONS: "Instalacje",
  ENVELOPE: "Obudowa",
  FINISHING: "Wykończenie",
  OPTIONAL: "Opcjonalne",
};

export function formatPlanCategory(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
