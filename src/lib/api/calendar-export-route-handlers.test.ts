import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const exportStagesToGoogleCalendar = vi.hoisted(() => vi.fn());
const reportError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/observability/report-error", () => ({
  reportError,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));

vi.mock("@/lib/google-calendar/export-stages-to-calendar", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/google-calendar/export-stages-to-calendar")
  >("@/lib/google-calendar/export-stages-to-calendar");
  return {
    ...actual,
    exportStagesToGoogleCalendar,
  };
});

import {
  GoogleCalendarNotConnectedError,
  InvalidCalendarStageSlugError,
} from "@/lib/google-calendar/export-stages-to-calendar";
import { POST as postCalendarExport } from "@/app/api/plans/[planId]/calendar-export/route";

const USER_A = "user-a";
const PLAN_A = "plan-owned-by-a";

function asUser(userId: string) {
  getUser.mockResolvedValue({
    data: { user: { id: userId, email: `${userId}@example.com` } },
  });
}

function asAnonymous() {
  getUser.mockResolvedValue({ data: { user: null } });
}

async function invokePostCalendarExport(
  planId: string,
  body: unknown = {},
): Promise<Response> {
  return postCalendarExport(
    new Request(`http://localhost/api/plans/${planId}/calendar-export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ planId }) },
  );
}

describe("calendar-export route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    asAnonymous();

    const response = await invokePostCalendarExport(PLAN_A);

    expect(response.status).toBe(401);
    expect(exportStagesToGoogleCalendar).not.toHaveBeenCalled();
  });

  it("returns 404 when plan is not found for user", async () => {
    asUser(USER_A);
    exportStagesToGoogleCalendar.mockRejectedValue(new Error("Plan not found"));

    const response = await invokePostCalendarExport(PLAN_A);

    expect(response.status).toBe(404);
  });

  it("returns 400 when stageSlug is invalid", async () => {
    asUser(USER_A);
    exportStagesToGoogleCalendar.mockRejectedValue(
      new InvalidCalendarStageSlugError("roofing"),
    );

    const response = await invokePostCalendarExport(PLAN_A, {
      stageSlugs: ["roofing"],
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Nieprawidłowy etap dla tego planu");
  });

  it("returns 412 when Google Calendar is not connected", async () => {
    asUser(USER_A);
    exportStagesToGoogleCalendar.mockRejectedValue(
      new GoogleCalendarNotConnectedError(),
    );

    const response = await invokePostCalendarExport(PLAN_A);

    expect(response.status).toBe(412);
    const body = await response.json();
    expect(body.error).toContain("Połącz konto Google Calendar");
  });

  it("returns 200 with createdCount on success", async () => {
    asUser(USER_A);
    exportStagesToGoogleCalendar.mockResolvedValue({
      createdCount: 3,
      calendarId: "primary",
    });

    const response = await invokePostCalendarExport(PLAN_A, {
      stageSlugs: ["foundations"],
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ createdCount: 3, calendarId: "primary" });
    expect(exportStagesToGoogleCalendar).toHaveBeenCalledWith({
      userId: USER_A,
      planId: PLAN_A,
      stageSlugs: ["foundations"],
    });
  });
});
