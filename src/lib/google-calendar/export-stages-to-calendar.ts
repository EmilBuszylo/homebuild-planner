import { loadStageNotesForPlan } from "@/lib/plan/load-plan-stage-notes";
import { prisma } from "@/lib/prisma";

import { buildGoogleCalendarEvents } from "./build-stage-events";
import { getGoogleCalendarApi } from "./google-oauth";

export class InvalidCalendarStageSlugError extends Error {
  constructor(stageSlug: string) {
    super(`Invalid stage slug: ${stageSlug}`);
    this.name = "InvalidCalendarStageSlugError";
  }
}

export class GoogleCalendarNotConnectedError extends Error {
  constructor() {
    super("Google Calendar not connected");
    this.name = "GoogleCalendarNotConnectedError";
  }
}

export async function exportStagesToGoogleCalendar(params: {
  userId: string;
  planId: string;
  stageSlugs?: string[];
}): Promise<{ createdCount: number; calendarId: "primary" }> {
  const { userId, planId, stageSlugs } = params;

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          stageResults: { orderBy: { sortOrder: "asc" } },
          responses: true,
        },
      },
    },
  });

  if (!plan || plan.userId !== userId) {
    throw new Error("Plan not found");
  }

  const version = plan.versions[0];
  if (!version || version.stageResults.length === 0) {
    throw new Error("Plan has no stage results");
  }

  const activeSlugs = version.stageResults.map((row) => row.stageSlug);
  const slugsToExport = stageSlugs ?? activeSlugs;

  for (const slug of slugsToExport) {
    if (!activeSlugs.includes(slug)) {
      throw new InvalidCalendarStageSlugError(slug);
    }
  }

  const stageDefs = await prisma.constructionStage.findMany({
    where: { slug: { in: activeSlugs } },
    select: { slug: true, name: true },
  });
  const nameBySlug = new Map(stageDefs.map((row) => [row.slug, row.name]));

  const keyDate =
    version.responses.find((r) => r.questionSlug === "key_date")?.value ?? "";

  const stages = version.stageResults.map((result) => ({
    stageSlug: result.stageSlug,
    name: nameBySlug.get(result.stageSlug) ?? result.stageSlug,
    estimatedCost: result.estimatedCost,
    startDay: result.startDay,
    durationDays: result.durationDays,
  }));

  const stageNotes = await loadStageNotesForPlan(planId, activeSlugs);
  const events = buildGoogleCalendarEvents({
    keyDate,
    stages,
    stageNotes,
    stageSlugs: slugsToExport,
  });

  const calendar = await getGoogleCalendarApi(userId);
  if (!calendar) {
    throw new GoogleCalendarNotConnectedError();
  }

  let createdCount = 0;
  for (const event of events) {
    await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });
    createdCount += 1;
  }

  return { createdCount, calendarId: "primary" };
}
