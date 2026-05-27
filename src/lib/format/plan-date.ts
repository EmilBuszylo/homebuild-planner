export function addDaysToIsoDate(isoDate: string, dayOffset: number): string {
  const base = new Date(`${isoDate}T12:00:00`);
  base.setDate(base.getDate() + dayOffset);
  return base.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
