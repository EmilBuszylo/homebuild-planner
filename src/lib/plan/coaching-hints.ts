/**
 * Wskazówki coachingowe na timeline.
 * - targetStageSlug: wiersz etapu, którego dotyczy porada.
 * - anchorStageSlug: etap wymagany w planie (razem z targetem); pozycja z kotwicy lub z innego etapu odniesienia.
 * Wyświetlane tylko gdy wszystkie wymagane etapy są w planie.
 */

/** Minimalne odsunięcie markera od startu etapu-kotwicy (unika dnia 0 planu i krawędzi osi). */
export const COACHING_MARKER_MIN_OFFSET_DAYS = 7;

export type CoachingHintDefinition = {
  id: string;
  targetStageSlug: string;
  anchorStageSlug: string;
  note: string;
  /** Dzień względem startu kotwicy (nie mniej niż COACHING_MARKER_MIN_OFFSET_DAYS). */
  anchorOffsetDays?: number;
  /** Ułamek trwania etapu-kotwicy (np. 0.35 ≈ w trakcie fundamentów). */
  anchorProgress?: number;
  /**
   * Pozycja na osi: tyle dni przed startem wskazanego etapu (np. tynków).
   * Etap odniesienia musi być w planie; wiersz = `targetStageSlug`.
   */
  daysBeforeStageSlug?: string;
  daysBeforeStageStart?: number;
  /** Pozycja na osi: tyle dni po zakończeniu wskazanego etapu (np. wylewki). */
  daysAfterStageSlug?: string;
  daysAfterStageEnd?: number;
};

export const COACHING_HINT_DEFINITIONS: CoachingHintDefinition[] = [
  {
    id: "windows-early-foundations",
    targetStageSlug: "windows_doors",
    anchorStageSlug: "foundations",
    anchorProgress: 0.35,
    note: "Trwają fundamenty — to dobry moment, żeby porozmawiać z producentem okien i drzwi (wybór, wstępna wycena). Produkcja często trwa kilka–kilkanaście tygodni — im wcześniej złożysz zamówienie, tym mniejsze ryzyko przestoju po dachu.",
  },
  {
    id: "windows-order-walls",
    targetStageSlug: "windows_doors",
    anchorStageSlug: "walls",
    anchorOffsetDays: 7,
    note: "Wchodzisz w murowanie — jeśli nie masz jeszcze zamówionych okien i drzwi, zrób to teraz. Po wykonaniu otworów i dachu będzie można zmierzyć, ale kolejka u producenta i tak liczy się od dziś.",
  },
  {
    id: "windows-production-deadline",
    targetStageSlug: "windows_doors",
    anchorStageSlug: "windows_doors",
    anchorOffsetDays: 7,
    note: "Etap montażu stolarki — jeśli okna nie są jeszcze w produkcji, może być za późno bez opóźnienia kolejnych prac. Montaż zwykle po suchych ścianach i gotowym dachu, przed tynkami wewnątrz.",
  },
  {
    id: "electrical-book-roof",
    targetStageSlug: "electrical",
    anchorStageSlug: "roof_covering",
    anchorOffsetDays: 7,
    note: "Dach i obrys budynku są na finiszu — warto już umawiać elektryka (bruzdy, podejścia). Dobre ekipy instalacyjne mają obłożenie kilka–kilkanaście tygodni do przodu.",
  },
  {
    id: "plumbing-book-roof",
    targetStageSlug: "plumbing",
    anchorStageSlug: "roof_covering",
    anchorOffsetDays: 14,
    note: "Dach i obrys budynku są na finiszu — warto już umawiać hydraulika (bruzdy, podejścia). Dobre ekipy instalacyjne mają obłożenie kilka–kilkanaście tygodni do przodu.",
  },
  {
    id: "plaster-book-electrical",
    targetStageSlug: "electrical",
    anchorStageSlug: "electrical",
    anchorOffsetDays: 7,
    note: "Zaraz startują (lub trwają) prace elektryczne podtynkowe — poszukaj ekipy tynkarskiej na termin po zakończeniu bruzd. Tynki przed instalacjami w ścianach to najczęstszy powód drogich poprawek.",
  },
  {
    id: "screed-book-plumbing",
    targetStageSlug: "floor_screeds",
    anchorStageSlug: "plumbing",
    anchorOffsetDays: 7,
    note: "Hydraulika w toku — warto już pytać o wylewki (po tynkach i po ułożeniu ogrzewania podłogowego / rozprowadzenia). Ekipy od jastrychu też bywają zarezerwowane z wyprzedzeniem.",
  },
  {
    id: "heating-ufh-before-screed",
    targetStageSlug: "heating",
    anchorStageSlug: "heating",
    anchorOffsetDays: 7,
    note: "To etap podłogówki i rozprowadzenia (oraz ewentualnie grzejników) — musi być gotowy przed wylewką. Źródło ciepła i kotłownia to osobna robota, zwykle po wylewce.",
  },
  {
    id: "heating-boiler-after-screed",
    targetStageSlug: "heating",
    anchorStageSlug: "floor_screeds",
    daysAfterStageSlug: "floor_screeds",
    daysAfterStageEnd: 14,
    note: "Wylewka powinna mieć min. ok. 2 tygodnie na wyschnięcie — dopiero potem montaż pieca, pompy ciepła i wykończenie kotłowni. Wcześniejszy montaż grozi uszkodzeniem jastrychu.",
  },
  {
    id: "insulation-facade-same-crew",
    targetStageSlug: "insulation",
    anchorStageSlug: "insulation",
    anchorOffsetDays: 7,
    note: "Ocieplenie i elewację często robi jedna ekipa w jednym zleceniu — warto umówić komplet (styropian/wełna + tynk elewacyjny), żeby domknąć obwód na raz i uniknąć dwóch mobilizacji.",
  },
  {
    id: "electrical-close-before-plaster",
    targetStageSlug: "electrical",
    anchorStageSlug: "electrical",
    daysBeforeStageSlug: "interior_plaster",
    daysBeforeStageStart: 60,
    note: "Na ok. dwa miesiące przed tynkami domknij instalację elektryczną w ścianach (przewody, puszki, rozdzielnica). Tynki przed zamknięciem instalacji to częsty powód drogich poprawek.",
  },
  {
    id: "plumbing-close-before-plaster",
    targetStageSlug: "plumbing",
    anchorStageSlug: "plumbing",
    daysBeforeStageSlug: "interior_plaster",
    daysBeforeStageStart: 60,
    note: "Na ok. dwa miesiące przed tynkami domknij hydraulikę w ścianach (podejścia, odpływy). Po tynkach zaczynają się prace mokre na podłodze — bez sensu kucać świeże ściany.",
  },
];

export type TimelineCoachingMarker = {
  id: string;
  markerDay: number;
  note: string;
};

export type ResolvedCoachingForStage = {
  markers: TimelineCoachingMarker[];
};

export type PlanStageTiming = {
  stageSlug: string;
  startDay: number;
  durationDays: number;
};

function visualDurationDays(durationDays: number): number {
  return Math.max(durationDays, 1);
}

export function computeCoachingMarkerDay(
  anchorStartDay: number,
  anchorDurationDays: number,
  options?: Pick<CoachingHintDefinition, "anchorOffsetDays" | "anchorProgress">,
): number {
  const duration = visualDurationDays(anchorDurationDays);
  const minOffset = Math.min(
    COACHING_MARKER_MIN_OFFSET_DAYS,
    Math.max(1, Math.floor(duration / 2)),
  );

  let day: number;
  if (options?.anchorProgress !== undefined) {
    day =
      anchorStartDay +
      Math.max(minOffset, Math.round(duration * options.anchorProgress));
  } else {
    const extra = options?.anchorOffsetDays ?? COACHING_MARKER_MIN_OFFSET_DAYS;
    day = anchorStartDay + Math.max(minOffset, extra);
  }

  const anchorEnd = anchorStartDay + duration;
  const latestInsideAnchor = anchorEnd - 1;
  if (day > latestInsideAnchor && latestInsideAnchor > anchorStartDay) {
    day = latestInsideAnchor;
  }

  return Math.max(day, anchorStartDay + minOffset);
}

function computeMarkerDay(
  def: CoachingHintDefinition,
  stageBySlug: Map<string, PlanStageTiming>,
  anchor: PlanStageTiming,
): number | null {
  if (def.daysBeforeStageSlug !== undefined) {
    const reference = stageBySlug.get(def.daysBeforeStageSlug);
    if (!reference) {
      return null;
    }
    const leadDays =
      def.daysBeforeStageStart ?? COACHING_MARKER_MIN_OFFSET_DAYS;
    return Math.max(
      COACHING_MARKER_MIN_OFFSET_DAYS,
      reference.startDay - leadDays,
    );
  }

  if (def.daysAfterStageSlug !== undefined) {
    const reference = stageBySlug.get(def.daysAfterStageSlug);
    if (!reference) {
      return null;
    }
    const lagDays =
      def.daysAfterStageEnd ?? COACHING_MARKER_MIN_OFFSET_DAYS;
    return (
      reference.startDay +
      visualDurationDays(reference.durationDays) +
      lagDays
    );
  }

  return computeCoachingMarkerDay(
    anchor.startDay,
    anchor.durationDays,
    def,
  );
}

export function resolveCoachingHintsForTimeline(
  planStages: PlanStageTiming[],
): Map<string, ResolvedCoachingForStage> {
  const stageBySlug = new Map(planStages.map((s) => [s.stageSlug, s]));

  const resolved = new Map<string, ResolvedCoachingForStage>();

  const ensure = (slug: string): ResolvedCoachingForStage => {
    let entry = resolved.get(slug);
    if (!entry) {
      entry = { markers: [] };
      resolved.set(slug, entry);
    }
    return entry;
  };

  for (const def of COACHING_HINT_DEFINITIONS) {
    const target = stageBySlug.get(def.targetStageSlug);
    const anchor = stageBySlug.get(def.anchorStageSlug);
    if (!target || !anchor) {
      continue;
    }

    const markerDay = computeMarkerDay(def, stageBySlug, anchor);
    if (markerDay === null) {
      continue;
    }

    ensure(def.targetStageSlug).markers.push({
      id: def.id,
      markerDay,
      note: def.note,
    });
  }

  return resolved;
}
