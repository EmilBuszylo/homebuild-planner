import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const planFindUnique = vi.hoisted(() => vi.fn());
const planFindFirst = vi.hoisted(() => vi.fn());
const prismaTransaction = vi.hoisted(() => vi.fn());
const constructionStageFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    plan: {
      findUnique: planFindUnique,
      findFirst: planFindFirst,
    },
    $transaction: prismaTransaction,
    constructionStage: {
      findMany: constructionStageFindMany,
    },
  },
}));

import { validQuestionnairePayload } from "@/lib/api/test-fixtures/questionnaire-payload";

import { GET as getPlanResults } from "@/app/api/plans/[planId]/results/route";
import { POST as postRecalculate } from "@/app/api/plans/[planId]/recalculate/route";
import { POST as postPlans } from "@/app/api/plans/route";

const USER_A = "user-a";
const USER_B = "user-b";
const PLAN_B = "plan-owned-by-b";

export const harnessMocks = {
  getUser,
  planFindUnique,
  planFindFirst,
  prismaTransaction,
  constructionStageFindMany,
};

export function asUser(userId: string) {
  getUser.mockResolvedValue({
    data: { user: { id: userId, email: `${userId}@example.com` } },
  });
}

export function asAnonymous() {
  getUser.mockResolvedValue({ data: { user: null } });
}

export function resetHarnessMocks() {
  vi.clearAllMocks();
}

export async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function invokeGetResults(planId: string) {
  return getPlanResults(
    new Request(`http://localhost/api/plans/${planId}/results`),
    { params: Promise.resolve({ planId }) },
  );
}

export async function invokePostPlans(body: unknown) {
  return postPlans(
    new Request("http://localhost/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function invokeRecalculate(planId: string, body: unknown) {
  return postRecalculate(
    new Request(`http://localhost/api/plans/${planId}/recalculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ planId }) },
  );
}

function mockPlanWithStageResults(params: {
  planId: string;
  userId: string;
}) {
  planFindUnique.mockResolvedValue({
    id: params.planId,
    userId: params.userId,
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

describe("plans route handlers", () => {
  beforeEach(() => {
    resetHarnessMocks();
  });

  describe("harness smoke", () => {
    it("returns 401 when unauthenticated on GET results", async () => {
      asAnonymous();

      const response = await invokeGetResults("plan-any");

      expect(response.status).toBe(401);
      const body = await readJson<{ error: string }>(response);
      expect(body.error).toBe("Brak autoryzacji");
      expect(planFindUnique).not.toHaveBeenCalled();
    });
  });

  describe("ownership and authentication (Risk #1, #2)", () => {
    it("returns 404 without plan payload when GET results for another user's plan", async () => {
      asUser(USER_A);
      mockPlanWithStageResults({ planId: PLAN_B, userId: USER_B });

      const response = await invokeGetResults(PLAN_B);

      expect(response.status).toBe(404);
      const body = await readJson<Record<string, unknown>>(response);
      expect(body.error).toBe("Nie znaleziono planu");
      expect(body.stages).toBeUndefined();
      expect(body.totalCost).toBeUndefined();
    });

    it("returns 404 and does not recalculate when POST targets another user's plan", async () => {
      asUser(USER_A);
      planFindUnique.mockResolvedValue({ id: PLAN_B, userId: USER_B });

      const response = await invokeRecalculate(PLAN_B, validQuestionnairePayload);

      expect(response.status).toBe(404);
      const body = await readJson<{ error: string }>(response);
      expect(body.error).toBe("Nie znaleziono planu");
      expect(prismaTransaction).not.toHaveBeenCalled();
    });

    it("returns 200 with non-empty stages when GET results for own plan", async () => {
      asUser(USER_A);
      mockPlanWithStageResults({ planId: PLAN_B, userId: USER_A });

      const response = await invokeGetResults(PLAN_B);

      expect(response.status).toBe(200);
      const body = await readJson<{ stages: unknown[] }>(response);
      expect(body.stages.length).toBeGreaterThanOrEqual(1);
    });

    it("returns 401 when unauthenticated on POST /api/plans", async () => {
      asAnonymous();

      const response = await invokePostPlans(validQuestionnairePayload);

      expect(response.status).toBe(401);
      const body = await readJson<{ error: string }>(response);
      expect(body.error).toBe("Brak autoryzacji");
      expect(prismaTransaction).not.toHaveBeenCalled();
    });

    it("returns 401 when unauthenticated on POST recalculate", async () => {
      asAnonymous();

      const response = await invokeRecalculate(PLAN_B, validQuestionnairePayload);

      expect(response.status).toBe(401);
      const body = await readJson<{ error: string }>(response);
      expect(body.error).toBe("Brak autoryzacji");
      expect(planFindUnique).not.toHaveBeenCalled();
      expect(prismaTransaction).not.toHaveBeenCalled();
    });

    it("returns 404 when GET results for a missing plan", async () => {
      asUser(USER_A);
      planFindUnique.mockResolvedValue(null);

      const response = await invokeGetResults("plan-missing");

      expect(response.status).toBe(404);
      const body = await readJson<{ error: string }>(response);
      expect(body.error).toBe("Nie znaleziono planu");
    });

    it("returns 404 when POST recalculate for a missing plan", async () => {
      asUser(USER_A);
      planFindUnique.mockResolvedValue(null);

      const response = await invokeRecalculate("plan-missing", validQuestionnairePayload);

      expect(response.status).toBe(404);
      const body = await readJson<{ error: string }>(response);
      expect(body.error).toBe("Nie znaleziono planu");
      expect(prismaTransaction).not.toHaveBeenCalled();
    });
  });

  describe("server validation on create (Risk #6)", () => {
    it("returns 400 with details and does not start a transaction when POST body is invalid", async () => {
      asUser(USER_A);

      const response = await invokePostPlans({
        ...validQuestionnairePayload,
        area: 1,
      });

      expect(response.status).toBe(400);
      const body = await readJson<{
        error: string;
        details: unknown;
      }>(response);
      expect(body.error).toBe("Nieprawidłowe dane ankiety");
      expect(body.details).toBeDefined();
      expect(prismaTransaction).not.toHaveBeenCalled();
    });
  });
});
