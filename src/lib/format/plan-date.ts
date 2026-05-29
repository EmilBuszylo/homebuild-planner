const plDateOptions: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
};

const plAxisDateOptions: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
};

function dateFromKeyAndOffset(isoDate: string, dayOffset: number): Date {
  const base = new Date(`${isoDate}T12:00:00`);
  base.setDate(base.getDate() + dayOffset);
  return base;
}

export function formatBenchmarkAsOf(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString("pl-PL", plDateOptions);
}

export function addDaysToIsoDate(isoDate: string, dayOffset: number): string {
  return dateFromKeyAndOffset(isoDate, dayOffset).toLocaleDateString(
    "pl-PL",
    plDateOptions,
  );
}

/** Krótszy format na oś harmonogramu (mniej nachodzenia etykiet). */
export function formatTimelineAxisDate(
  isoDate: string,
  dayOffset: number,
  includeYear = false,
): string {
  return dateFromKeyAndOffset(isoDate, dayOffset).toLocaleDateString("pl-PL", {
    ...plAxisDateOptions,
    ...(includeYear ? { year: "numeric" as const } : {}),
  });
}
