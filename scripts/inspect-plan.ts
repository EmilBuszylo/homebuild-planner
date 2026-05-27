import { PrismaClient } from "@prisma/client";

import { getFootprintArea, getUsableArea } from "../src/lib/plan-generation/effective-area";
import { computeStageCost } from "../src/lib/plan-generation/compute-costs";

const planId = process.argv[2] ?? "cmpnublgn000owdan2s0ptnrj";

async function main() {
  const prisma = new PrismaClient();

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          responses: true,
          stageResults: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!plan?.versions[0]) {
    console.log("Plan not found");
    return;
  }

  const v = plan.versions[0];
  const responses = Object.fromEntries(
    v.responses.map((r) => [r.questionSlug, r.value]),
  );

  console.log("=== RESPONSES ===");
  console.log(JSON.stringify(responses, null, 2));
  console.log("usable m²:", getUsableArea(responses));
  console.log("footprint m²:", getFootprintArea(responses));

  const stages = await prisma.constructionStage.findMany({
    include: { costModifiers: true },
    orderBy: { sortOrder: "asc" },
  });

  const focus = [
    "foundations",
    "floor_slabs",
    "roof_structure",
    "roof_covering",
  ];

  for (const slug of focus) {
    const stage = stages.find((s) => s.slug === slug)!;
    const stored = v.stageResults.find((x) => x.stageSlug === slug);
    const cost = computeStageCost(stage, responses);
    console.log(`\n--- ${slug} ---`);
    console.log("stored:", stored?.estimatedCost, "computed:", cost);
    console.log(
      "base rates std:",
      stage.costPerM2Standard,
      "billing area:",
      slug === "foundations" || slug === "floor_slabs"
        ? getFootprintArea(responses)
        : getUsableArea(responses),
    );
    const matching = stage.costModifiers.filter(
      (m) => responses[m.triggerQuestionSlug] === m.triggerValue,
    );
    if (matching.length) {
      console.log(
        "modifiers:",
        matching.map((m) => ({
          trigger: `${m.triggerQuestionSlug}=${m.triggerValue}`,
          desc: m.description?.slice(0, 40),
        })),
      );
    }
  }

  await prisma.$disconnect();
}

main();
