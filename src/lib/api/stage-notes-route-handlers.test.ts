import type { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const planFindUnique = vi.hoisted(() => vi.fn());
const planVersionFindFirst = vi.hoisted(() => vi.fn());
const prismaTransaction = vi.hoisted(() => vi.fn());
const planStageNoteFindMany = vi.hoisted(() => vi.fn());
const constructionStageFindMany = vi.hoisted(() => vi.fn());
const reportError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/observability/report-error", () => ({
  reportError,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    plan: {
      findUnique: planFindUnique,
    },
    planVersion: {
      findFirst: planVersionFindFirst,
    },
    $transaction: prismaTransaction,
    constructionStage: {
      findMany: constructionStageFindMany,
    },
    planStageNote: {
      findMany: planStageNoteFindMany,
    },
  },
}));

import { GET as getPlanResults } from "@/app/api/plans/[planId]/results/route";
import { PUT as putStageNote } from "@/app/api/plans/[planId]/stage-notes/route";

const USER_A = "user-a";
const USER_B = "user-b";
const PLAN_A = "plan-owned-by-a";
const PLAN_B = "plan-owned-by-b";
const UPDATED_AT = new Date("2026-06-11T10:00:00.000Z");

function asUser(userId: string) {
  getUser.mockResolvedValue({
    data: { user: { id: userId, email: `${userId}@example.com` } },
  });
}

function asAnonymous() {
  getUser.mockResolvedValue({ data: { user: null } });
}

function mockActiveStages(slugs: string[]) {
  planVersionFindFirst.mockResolvedValue({
    stageResults: slugs.map((stageSlug) => ({ stageSlug })),
  });
}

function mockOwnedPlan(planId: string, userId: string) {
  planFindUnique.mockResolvedValue({
    id: planId,
    userId,
  });
}

function mockPlanResultsLoad(planId: string, userId: string) {
  planFindUnique.mockResolvedValue({
    id: planId,
    userId,
    versions: [
      {
        versionNumber: 1,
        refinementApplied: false,
        benchmarkFetchedAt: null,
        benchmarkSourceName: null,
        stageResults: [
          {
            stageSlug: "foundations",
            estimatedCost: 100_000,
            startDay: 0,
            durationDays: 30,
            sortOrder: 1,
          },
        ],
        responses: [{ questionSlug: "key_date", value: "2026-09-01" }],
      },
    ],
  });
  constructionStageFindMany.mockResolvedValue([
    { slug: "foundations", name: "Fundamenty", category: "Budowa" },
  ]);
}

async function invokePutStageNote(
  planId: string,
  body: unknown,
): Promise<Response> {
  return putStageNote(
    new Request(`http://localhost/api/plans/${planId}/stage-notes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ planId }) },
  );
}

async function invokeGetResults(planId: string): Promise<Response> {
  return getPlanResults(
    new Request(`http://localhost/api/plans/${planId}/results`),
    { params: Promise.resolve({ planId }) },
  );
}

describe("stage-notes route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveStages(["foundations"]);
  });

  describe("PUT /api/plans/[planId]/stage-notes", () => {
    it("returns 401 when unauthenticated", async () => {
      asAnonymous();

      const response = await invokePutStageNote(PLAN_A, {
        stageSlug: "foundations",
        body: "Notatka",
        isPinned: false,
      });

      expect(response.status).toBe(401);
      expect(planFindUnique).not.toHaveBeenCalled();
    });

    it("returns 404 when user does not own the plan", async () => {
      asUser(USER_A);
      mockOwnedPlan(PLAN_B, USER_B);

      const response = await invokePutStageNote(PLAN_B, {
        stageSlug: "foundations",
        body: "Notatka",
        isPinned: false,
      });

      expect(response.status).toBe(404);
      expect(prismaTransaction).not.toHaveBeenCalled();
    });

    it("returns 400 when stageSlug is not in the current plan stages", async () => {
      asUser(USER_A);
      mockOwnedPlan(PLAN_A, USER_A);
      mockActiveStages(["foundations"]);

      prismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          planStageNote: {
            deleteMany: vi.fn(),
            upsert: vi.fn(),
          },
        } as unknown as Prisma.TransactionClient;
        return callback(tx);
      });

      const response = await invokePutStageNote(PLAN_A, {
        stageSlug: "roofing",
        body: "Notatka",
        isPinned: false,
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Nieprawidłowy etap dla tego planu");
    });

    it("returns 200 with saved note on upsert", async () => {
      asUser(USER_A);
      mockOwnedPlan(PLAN_A, USER_A);

      const planStageNoteUpsert = vi.fn().mockResolvedValue({
        stageSlug: "foundations",
        body: "Kontakt z wykonawcą",
        isPinned: true,
        updatedAt: UPDATED_AT,
      });

      prismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          planStageNote: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            upsert: planStageNoteUpsert,
          },
        } as unknown as Prisma.TransactionClient;
        return callback(tx);
      });

      const response = await invokePutStageNote(PLAN_A, {
        stageSlug: "foundations",
        body: "Kontakt z wykonawcą",
        isPinned: true,
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({
        stageSlug: "foundations",
        body: "Kontakt z wykonawcą",
        isPinned: true,
        updatedAt: UPDATED_AT.toISOString(),
      });
      expect(planStageNoteUpsert).toHaveBeenCalledOnce();
    });

    it("returns 200 with deleted flag when body is empty and not pinned", async () => {
      asUser(USER_A);
      mockOwnedPlan(PLAN_A, USER_A);

      const planStageNoteDeleteMany = vi.fn().mockResolvedValue({ count: 1 });

      prismaTransaction.mockImplementation(async (callback) => {
        const tx = {
          planStageNote: {
            deleteMany: planStageNoteDeleteMany,
            upsert: vi.fn(),
          },
        } as unknown as Prisma.TransactionClient;
        return callback(tx);
      });

      const response = await invokePutStageNote(PLAN_A, {
        stageSlug: "foundations",
        body: "",
        isPinned: false,
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ deleted: true, stageSlug: "foundations" });
      expect(planStageNoteDeleteMany).toHaveBeenCalledWith({
        where: { planId: PLAN_A, stageSlug: "foundations" },
      });
    });
  });

  describe("GET /api/plans/[planId]/results", () => {
    it("includes stageNotes after notes exist for active stages", async () => {
      asUser(USER_A);
      mockPlanResultsLoad(PLAN_A, USER_A);
      planStageNoteFindMany.mockResolvedValue([
        {
          stageSlug: "foundations",
          body: "Kontakt z wykonawcą",
          isPinned: true,
          updatedAt: UPDATED_AT,
        },
      ]);

      const response = await invokeGetResults(PLAN_A);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.stageNotes).toEqual({
        foundations: {
          body: "Kontakt z wykonawcą",
          isPinned: true,
          updatedAt: UPDATED_AT.toISOString(),
        },
      });
    });
  });
});
