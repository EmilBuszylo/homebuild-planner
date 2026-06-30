import { NextResponse } from "next/server";

import { reportError } from "@/lib/observability/report-error";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.dbHealth.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: { checkedAt: new Date() },
    });

    const [questionCount, stageCount] = await Promise.all([
      prisma.questionDefinition.count(),
      prisma.constructionStage.count(),
    ]);

    if (questionCount === 0 || stageCount === 0) {
      return NextResponse.json(
        {
          ok: false,
          reason: "knowledge_base_not_seeded",
          questionCount,
          stageCount,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      questionCount,
      stageCount,
    });
  } catch (error) {
    console.error("GET /api/health/db failed:", error);
    reportError(error, { route: "GET /api/health/db" });
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
