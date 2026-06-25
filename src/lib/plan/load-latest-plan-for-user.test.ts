import { beforeEach, describe, expect, it, vi } from "vitest";

const planFindFirst = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    plan: {
      findFirst: planFindFirst,
    },
  },
}));

import { loadLatestPlanForUser } from "./load-latest-plan-for-user";

const USER_ID = "user-1";

describe("loadLatestPlanForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nav variant queries id only", async () => {
    planFindFirst.mockResolvedValue({ id: "plan-1" });

    const result = await loadLatestPlanForUser(USER_ID, "nav");

    expect(result).toEqual({ id: "plan-1" });
    expect(planFindFirst).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
  });

  it("dashboard variant queries id and createdAt", async () => {
    const createdAt = new Date("2026-06-01");
    planFindFirst.mockResolvedValue({ id: "plan-1", createdAt });

    const result = await loadLatestPlanForUser(USER_ID, "dashboard");

    expect(result).toEqual({ id: "plan-1", createdAt });
    expect(planFindFirst).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });
  });

  it("questionnaire variant includes latest version responses", async () => {
    planFindFirst.mockResolvedValue({
      id: "plan-1",
      versions: [
        {
          responses: [{ questionSlug: "area", value: "120" }],
        },
      ],
    });

    const result = await loadLatestPlanForUser(USER_ID, "questionnaire");

    expect(result?.id).toBe("plan-1");
    expect(result?.versions[0]?.responses).toHaveLength(1);
    expect(planFindFirst).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: "desc" },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: { responses: true },
        },
      },
    });
  });

  it("returns null when user has no plan", async () => {
    planFindFirst.mockResolvedValue(null);

    const result = await loadLatestPlanForUser(USER_ID, "nav");

    expect(result).toBeNull();
  });
});
