import type { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { minimalStagesForGeneration } from "@/lib/plan-generation/test-fixtures/minimal-stages";

const getUser = vi.hoisted(() => vi.fn());
const planFindUnique = vi.hoisted(() => vi.fn());
const planFindFirst = vi.hoisted(() => vi.fn());
const prismaTransaction = vi.hoisted(() => vi.fn());
const constructionStageFindMany = vi.hoisted(() => vi.fn());
const checkPlanRecalcLimit = vi.hoisted(() => vi.fn());
const reportError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/observability/report-error", () => ({
  reportError,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));

vi.mock("@/lib/rate-limit/plan-recalc", () => ({
  checkPlanRecalcLimit,
  getPlanRecalcPolicy: () => ({ limit: 3, windowHours: 24 }),
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
  checkPlanRecalcLimit,
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

const NEW_PLAN_ID = "plan-new-1";

function mockPostPlansTransaction(
  stages: typeof minimalStagesForGeneration | [],
) {
  const planStageResultCreateMany = vi.fn().mockResolvedValue({ count: 0 });

  const tx = {
    user: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    plan: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: NEW_PLAN_ID, userId: USER_A }),
    },
    planVersion: {
      create: vi.fn().mockResolvedValue({
        id: "pv-new-1",
        planId: NEW_PLAN_ID,
        versionNumber: 1,
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    questionnaireResponse: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    constructionStage: {
      findMany: vi.fn().mockResolvedValue(stages),
    },
    marketBenchmark: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    planStageResult: {
      createMany: planStageResultCreateMany,
    },
  } as unknown as Prisma.TransactionClient;

  prismaTransaction.mockImplementation(async (callback) => callback(tx));

  return { planStageResultCreateMany };
}

function sumEstimatedCostsFromCreateManyCall(
  createMany: ReturnType<typeof vi.fn>,
  callIndex: number,
): number {
  const createManyArg = createMany.mock.calls[callIndex]?.[0] as {
    data: { estimatedCost: number }[];
  };
  return createManyArg.data.reduce(
    (sum, row) => sum + row.estimatedCost,
    0,
  );
}

function mockRecalculateTransaction(planId: string) {
  const planStageResultCreateMany = vi.fn().mockResolvedValue({ count: 0 });
  let currentLatestVersion = 1;

  prismaTransaction.mockImplementation(async (callback) => {
    const latestForTx = currentLatestVersion;
    const nextVersionNumber = latestForTx + 1;

    const tx = {
      planVersion: {
        findFirst: vi.fn().mockResolvedValue({ versionNumber: latestForTx }),
        create: vi.fn().mockResolvedValue({
          id: `pv-${nextVersionNumber}`,
          planId,
          versionNumber: nextVersionNumber,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      plan: {
        update: vi.fn().mockResolvedValue({ id: planId }),
      },
      questionnaireResponse: {
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      constructionStage: {
        findMany: vi.fn().mockResolvedValue(minimalStagesForGeneration),
      },
      marketBenchmark: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      planStageResult: {
        createMany: planStageResultCreateMany,
      },
    } as unknown as Prisma.TransactionClient;

    await callback(tx);
    currentLatestVersion = nextVersionNumber;
  });

  return { planStageResultCreateMany };
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
    checkPlanRecalcLimit.mockResolvedValue({
      allowed: true,
      limit: 3,
      windowHours: 24,
      retryAfterSeconds: null,
    });
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

    it("returns 500 JSON when GET results hits a database error", async () => {
      asUser(USER_A);
      planFindUnique.mockRejectedValue(new Error("DB connection lost"));

      const response = await invokeGetResults(PLAN_B);

      expect(response.status).toBe(500);
      const body = await readJson<{ error: string }>(response);
      expect(body.error).toBe(
        "Nie udało się wczytać wyników planu. Spróbuj ponownie.",
      );
      expect(reportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          route: `GET /api/plans/${PLAN_B}/results`,
        }),
      );
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

  describe("POST /api/plans generation contract (Risk #4)", () => {
    it("returns 201 with planId and persists at least one stage result for golden payload", async () => {
      asUser(USER_A);
      const { planStageResultCreateMany } = mockPostPlansTransaction(
        minimalStagesForGeneration,
      );

      const response = await invokePostPlans(validQuestionnairePayload);

      expect(response.status).toBe(201);
      const body = await readJson<{ planId: string }>(response);
      expect(body.planId).toBe(NEW_PLAN_ID);
      expect(prismaTransaction).toHaveBeenCalledTimes(1);
      expect(planStageResultCreateMany).toHaveBeenCalledTimes(1);

      const createManyArg = planStageResultCreateMany.mock.calls[0]?.[0] as {
        data: { estimatedCost: number }[];
      };
      expect(createManyArg.data.length).toBeGreaterThanOrEqual(1);
      expect(createManyArg.data.every((row) => row.estimatedCost > 0)).toBe(
        true,
      );
    });

    it("Risk #4 regression: returns 201 when generation persists zero stage results", async () => {
      // Follow-up GET /api/plans/[planId]/results returns 404 — see research.md.
      asUser(USER_A);
      const { planStageResultCreateMany } = mockPostPlansTransaction([]);

      const response = await invokePostPlans(validQuestionnairePayload);

      expect(response.status).toBe(201);
      const body = await readJson<{ planId: string }>(response);
      expect(body.planId).toBe(NEW_PLAN_ID);
      expect(planStageResultCreateMany).toHaveBeenCalledTimes(1);

      const createManyArg = planStageResultCreateMany.mock.calls[0]?.[0] as {
        data: unknown[];
      };
      expect(createManyArg.data).toEqual([]);
    });
  });

  describe("POST recalculate reflects input changes (Risk #5)", () => {
    it("persists a different total estimated cost when area changes between recalculations", async () => {
      asUser(USER_A);
      planFindUnique.mockResolvedValue({ id: PLAN_B, userId: USER_A });
      const { planStageResultCreateMany } = mockRecalculateTransaction(PLAN_B);

      const payloadBase = { ...validQuestionnairePayload };

      const first = await invokeRecalculate(PLAN_B, {
        ...payloadBase,
        area: 120,
      });
      const second = await invokeRecalculate(PLAN_B, {
        ...payloadBase,
        area: 200,
      });

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(checkPlanRecalcLimit).toHaveBeenCalledTimes(2);
      expect(planStageResultCreateMany).toHaveBeenCalledTimes(2);

      const sumAt120 = sumEstimatedCostsFromCreateManyCall(
        planStageResultCreateMany,
        0,
      );
      const sumAt200 = sumEstimatedCostsFromCreateManyCall(
        planStageResultCreateMany,
        1,
      );

      expect(sumAt200).not.toBe(sumAt120);
      expect(sumAt200).toBeGreaterThan(sumAt120);
    });
  });

  describe("POST recalculate rate limit (Risk #7)", () => {
    it("returns 429 with PL message and does not persist stage results when rate limit denies", async () => {
      asUser(USER_A);
      planFindUnique.mockResolvedValue({ id: PLAN_B, userId: USER_A });
      const { planStageResultCreateMany } = mockRecalculateTransaction(PLAN_B);

      checkPlanRecalcLimit.mockResolvedValueOnce({
        allowed: false,
        retryAfterSeconds: 60,
        limit: 3,
        windowHours: 24,
      });

      const response = await invokeRecalculate(PLAN_B, validQuestionnairePayload);

      expect(response.status).toBe(429);
      const body = await readJson<{
        error: string;
        retryAfterSeconds: number;
        limit: number;
        windowHours: number;
      }>(response);
      expect(body.error).toBe(
        "Zbyt wiele przeliczeń w krótkim czasie. Spróbuj ponownie później.",
      );
      expect(body.retryAfterSeconds).toBe(60);
      expect(body.limit).toBe(3);
      expect(body.windowHours).toBe(24);
      expect(planStageResultCreateMany).not.toHaveBeenCalled();
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

  describe("server validation on recalculate (Risk #6)", () => {
    beforeEach(() => {
      asUser(USER_A);
      planFindUnique.mockResolvedValue({ id: PLAN_B, userId: USER_A });
    });

    it("returns 400 with details and does not start a transaction when area is invalid", async () => {
      const response = await invokeRecalculate(PLAN_B, {
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

    it("returns 400 with details and does not start a transaction when state order is invalid", async () => {
      const response = await invokeRecalculate(PLAN_B, {
        ...validQuestionnairePayload,
        starting_state: "CLOSED_SHELL",
        investment_state: "FOUNDATIONS",
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
