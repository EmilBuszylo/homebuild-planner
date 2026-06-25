import { prisma } from "@/lib/prisma";

export type LoadLatestPlanVariant = "nav" | "dashboard" | "questionnaire";

export async function loadLatestPlanForUser(
  userId: string,
  variant: "nav",
): Promise<{ id: string } | null>;
export async function loadLatestPlanForUser(
  userId: string,
  variant: "dashboard",
): Promise<{ id: string; createdAt: Date } | null>;
export async function loadLatestPlanForUser(
  userId: string,
  variant: "questionnaire",
): Promise<{
  id: string;
  versions: Array<{
    responses: Array<{ questionSlug: string; value: string }>;
  }>;
} | null>;
export async function loadLatestPlanForUser(
  userId: string,
  variant: LoadLatestPlanVariant,
) {
  const baseWhere = { userId };
  const baseOrder = { createdAt: "desc" as const };

  switch (variant) {
    case "nav":
      return prisma.plan.findFirst({
        where: baseWhere,
        orderBy: baseOrder,
        select: { id: true },
      });
    case "dashboard":
      return prisma.plan.findFirst({
        where: baseWhere,
        orderBy: baseOrder,
        select: { id: true, createdAt: true },
      });
    case "questionnaire":
      return prisma.plan.findFirst({
        where: baseWhere,
        orderBy: baseOrder,
        include: {
          versions: {
            orderBy: { versionNumber: "desc" },
            take: 1,
            include: { responses: true },
          },
        },
      });
  }
}
