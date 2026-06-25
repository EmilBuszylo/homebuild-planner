import { describe, expect, it } from "vitest";

import { buildGoogleCalendarEvents } from "@/lib/google-calendar/build-stage-events";

describe("buildGoogleCalendarEvents", () => {
  const stages = [
    {
      stageSlug: "foundations",
      name: "Fundamenty",
      estimatedCost: 100_000,
      startDay: 0,
      durationDays: 30,
    },
    {
      stageSlug: "roofing",
      name: "Dach",
      estimatedCost: 50_000,
      startDay: 30,
      durationDays: 14,
    },
  ];

  it("builds all-day events for all stages by default", () => {
    const events = buildGoogleCalendarEvents({
      keyDate: "2026-09-01",
      stages,
    });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      summary: "Fundamenty",
      start: { date: "2026-09-01" },
      end: { date: "2026-10-01" },
    });
    expect(events[1]).toMatchObject({
      summary: "Dach",
      start: { date: "2026-10-01" },
      end: { date: "2026-10-15" },
    });
  });

  it("filters to selected stage slugs", () => {
    const events = buildGoogleCalendarEvents({
      keyDate: "2026-09-01",
      stages,
      stageSlugs: ["roofing"],
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.summary).toBe("Dach");
  });

  it("uses one-day span when durationDays is zero", () => {
    const events = buildGoogleCalendarEvents({
      keyDate: "2026-09-01",
      stages: [
        {
          stageSlug: "milestone",
          name: "Kamień węgielny",
          estimatedCost: 0,
          startDay: 5,
          durationDays: 0,
        },
      ],
    });

    expect(events[0]).toMatchObject({
      start: { date: "2026-09-06" },
      end: { date: "2026-09-07" },
    });
  });

  it("includes user note in description when present", () => {
    const events = buildGoogleCalendarEvents({
      keyDate: "2026-09-01",
      stages: [stages[0]!],
      stageNotes: {
        foundations: {
          body: "Kontakt z wykonawcą",
          isPinned: false,
          updatedAt: "2026-06-11T10:00:00.000Z",
        },
      },
    });

    expect(events[0]?.description).toContain("Kontakt z wykonawcą");
  });
});
