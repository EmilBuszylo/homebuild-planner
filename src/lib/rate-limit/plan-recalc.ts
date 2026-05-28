import type { Prisma } from "@prisma/client";

export type PlanRecalcRateLimitResult = {
  allowed: boolean;
  limit: number;
  windowHours: number;
  retryAfterSeconds: number | null;
};

const DEFAULT_PLAN_RECALC_LIMIT = 3;
const DEFAULT_PLAN_RECALC_WINDOW_HOURS = 24;

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function getPlanRecalcPolicy(): { limit: number; windowHours: number } {
  const limit =
    parsePositiveInt(process.env.PLAN_RECALC_LIMIT) ?? DEFAULT_PLAN_RECALC_LIMIT;
  const windowHours =
    parsePositiveInt(process.env.PLAN_RECALC_WINDOW_HOURS) ??
    DEFAULT_PLAN_RECALC_WINDOW_HOURS;

  return { limit, windowHours };
}

export async function checkPlanRecalcLimit(
  tx: Prisma.TransactionClient,
  params: { userId: string; now?: Date },
): Promise<PlanRecalcRateLimitResult> {
  const { limit, windowHours } = getPlanRecalcPolicy();
  const now = params.now ?? new Date();
  const cutoff = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

  const [count, oldestInWindow] = await Promise.all([
    tx.planVersion.count({
      where: {
        createdAt: { gte: cutoff },
        plan: { userId: params.userId },
      },
    }),
    tx.planVersion.findFirst({
      where: {
        createdAt: { gte: cutoff },
        plan: { userId: params.userId },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  if (count < limit) {
    return { allowed: true, limit, windowHours, retryAfterSeconds: null };
  }

  const retryAfterSeconds = oldestInWindow
    ? Math.max(
        1,
        Math.ceil(
          (oldestInWindow.createdAt.getTime() +
            windowHours * 60 * 60 * 1000 -
            now.getTime()) /
            1000,
        ),
      )
    : null;

  return { allowed: false, limit, windowHours, retryAfterSeconds };
}

