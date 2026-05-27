const plDateOptions: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
};

export function formatBenchmarkAsOf(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString("pl-PL", plDateOptions);
}

export function addDaysToIsoDate(isoDate: string, dayOffset: number): string {
  const base = new Date(`${isoDate}T12:00:00`);
  base.setDate(base.getDate() + dayOffset);
  return base.toLocaleDateString("pl-PL", plDateOptions);
}
