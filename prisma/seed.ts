import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PrismaClient,
  QuestionType,
  InvestmentState,
} from "@prisma/client";

import { calibrationModifierDefs } from "../src/lib/plan-generation/calibration/modifier-defs";
import {
  calibrationStageRateDefs,
  type CalibrationStageRateDef,
} from "../src/lib/plan-generation/calibration/stage-rate-defs";

import { calibrationStageDescriptions } from "./calibration-stage-descriptions";

const prisma = new PrismaClient();
const seedDir = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Question definitions
// ---------------------------------------------------------------------------

/** Stan docelowy — plan do którego dąży inwestor (bez „od zera”). */
const targetStateOptions = [
  { value: "FOUNDATIONS", label: "Stan zero (fundamenty)" },
  { value: "OPEN_SHELL", label: "Stan surowy otwarty" },
  { value: "CLOSED_SHELL", label: "Stan surowy zamknięty" },
  { value: "DEVELOPER", label: "Stan deweloperski" },
] as const;

/** Aktualny stan — skąd startujemy (bez stanu deweloperskiego). */
const startingStateOptions = [
  { value: "FROM_SCRATCH", label: "Od zera (działka)" },
  { value: "FOUNDATIONS", label: "Fundamenty gotowe" },
  { value: "OPEN_SHELL", label: "Stan surowy otwarty" },
  { value: "CLOSED_SHELL", label: "Stan surowy zamknięty" },
] as const;

const questions = [
  {
    slug: "investment_state",
    label: "Stan docelowy budowy",
    type: QuestionType.SINGLE_CHOICE,
    required: true,
    sortOrder: 1,
    options: [...targetStateOptions],
    validation: null,
    unit: null,
  },
  {
    slug: "starting_state",
    label: "Aktualny stan budowy",
    type: QuestionType.SINGLE_CHOICE,
    required: true,
    sortOrder: 2,
    options: [...startingStateOptions],
    validation: null,
    unit: null,
  },
  {
    slug: "build_standard",
    label: "Standard wykończenia",
    type: QuestionType.SINGLE_CHOICE,
    required: true,
    sortOrder: 3,
    options: [
      { value: "ECONOMY", label: "Ekonomiczny" },
      { value: "STANDARD", label: "Standardowy" },
      { value: "PREMIUM", label: "Premium" },
    ],
    validation: null,
    unit: null,
  },
  {
    slug: "insulation_level",
    label: "Poziom ocieplenia",
    type: QuestionType.SINGLE_CHOICE,
    required: true,
    sortOrder: 4,
    options: [
      { value: "STANDARD", label: "Standardowy" },
      { value: "ENHANCED", label: "Wzmocniony" },
      { value: "PASSIVE", label: "Pasywny" },
    ],
    validation: null,
    unit: null,
  },
  {
    slug: "area",
    label: "Powierzchnia użytkowa",
    type: QuestionType.NUMBER,
    required: true,
    sortOrder: 5,
    options: null,
    validation: { min: 50, max: 500 },
    unit: "m²",
  },
  {
    slug: "floors",
    label: "Liczba kondygnacji",
    type: QuestionType.NUMBER,
    required: true,
    sortOrder: 6,
    options: null,
    validation: { min: 1, max: 3 },
    unit: null,
  },
  {
    slug: "has_attic",
    label: "Poddasze użytkowe",
    type: QuestionType.BOOLEAN,
    required: false,
    sortOrder: 7,
    options: null,
    validation: null,
    unit: null,
  },
  {
    slug: "roof_type",
    label: "Typ dachu",
    type: QuestionType.SINGLE_CHOICE,
    required: true,
    sortOrder: 8,
    options: [
      { value: "GABLE", label: "Dwuspadowy" },
      { value: "HIP", label: "Kopertowy" },
      { value: "MANSARD", label: "Mansardowy" },
      { value: "FLAT", label: "Płaski" },
    ],
    validation: null,
    unit: null,
  },
  {
    slug: "garage_spots",
    label: "Miejsca garażowe",
    type: QuestionType.NUMBER,
    required: false,
    sortOrder: 9,
    options: null,
    validation: { min: 0, max: 3 },
    unit: "szt.",
  },
  {
    slug: "balcony_count",
    label: "Liczba balkonów",
    type: QuestionType.NUMBER,
    required: false,
    sortOrder: 10,
    options: null,
    validation: { min: 0, max: 4 },
    unit: "szt.",
  },
  {
    slug: "window_count",
    label: "Liczba okien",
    type: QuestionType.NUMBER,
    required: true,
    sortOrder: 11,
    options: null,
    validation: { min: 1, max: 30 },
    unit: "szt.",
  },
  {
    slug: "exterior_door_count",
    label: "Liczba drzwi zewnętrznych",
    type: QuestionType.NUMBER,
    required: true,
    sortOrder: 12,
    options: null,
    validation: { min: 1, max: 5 },
    unit: "szt.",
  },
  {
    slug: "terrace_door_count",
    label: "Liczba drzwi tarasowych",
    type: QuestionType.NUMBER,
    required: false,
    sortOrder: 13,
    options: null,
    validation: { min: 0, max: 5 },
    unit: "szt.",
  },
  {
    slug: "sewage_disposal",
    label: "Odprowadzenie ścieków",
    type: QuestionType.SINGLE_CHOICE,
    required: true,
    sortOrder: 14,
    options: [
      { value: "MUNICIPAL", label: "Kanalizacja gminna" },
      { value: "SEPTIC_TANK", label: "Szambo" },
      { value: "TREATMENT_PLANT", label: "Oczyszczalnia" },
    ],
    validation: null,
    unit: null,
  },
  {
    slug: "water_supply",
    label: "Zaopatrzenie w wodę",
    type: QuestionType.SINGLE_CHOICE,
    required: true,
    sortOrder: 15,
    options: [
      { value: "MUNICIPAL", label: "Wodociąg gminny" },
      { value: "WELL", label: "Studnia" },
      { value: "NONE", label: "Bez przyłącza wody" },
    ],
    validation: null,
    unit: null,
  },
  {
    slug: "utility_distance_band",
    label: "Odległość od sieci (woda / kanalizacja)",
    type: QuestionType.SINGLE_CHOICE,
    required: true,
    sortOrder: 16,
    options: [
      { value: "UP_TO_50M", label: "Do 50 m" },
      { value: "UP_TO_100M", label: "Do 100 m" },
      { value: "UP_TO_200M", label: "Do 200 m" },
      { value: "OVER_200M", label: "Powyżej 200 m" },
    ],
    validation: null,
    unit: null,
  },
  {
    slug: "key_date",
    label: "Planowana data rozpoczęcia budowy",
    type: QuestionType.DATE,
    required: true,
    sortOrder: 17,
    options: null,
    validation: null,
    unit: null,
  },
] as const;

// ---------------------------------------------------------------------------
// Construction stages — shared calibration module (C4) + PL descriptions
// Workbook: context/changes/cost-calibration/calibration-rates.md
// ---------------------------------------------------------------------------

function toPrismaInvestmentState(
  state: CalibrationStageRateDef["completedByState"],
): InvestmentState | null {
  return state ?? null;
}

const stages = calibrationStageRateDefs.map((def) => ({
  slug: def.slug,
  name: def.name,
  description: calibrationStageDescriptions[def.slug],
  category: def.category,
  sortOrder: def.sortOrder,
  completedByState: toPrismaInvestmentState(def.completedByState),
  predecessorSlugs: [...def.predecessorSlugs],
  costPerM2Economy: def.costPerM2Economy,
  costPerM2Standard: def.costPerM2Standard,
  costPerM2Premium: def.costPerM2Premium,
  durationMinDays: def.durationMinDays,
  durationMaxDays: def.durationMaxDays,
}));

const modifiers = calibrationModifierDefs;

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

async function cleanupObsoleteSeedData() {
  console.log("Cleaning up obsolete seed data...");
  await prisma.questionDefinition
    .delete({ where: { slug: "has_terrace_doors" } })
    .catch(() => {});

  const removedModifiers = await prisma.stageCostModifier.deleteMany({
    where: {
      OR: [
        { triggerQuestionSlug: "has_terrace_doors" },
        {
          triggerQuestionSlug: "insulation_level",
          NOT: { description: { startsWith: "[PERCENT:" } },
        },
      ],
    },
  });
  console.log(`  ✓ removed ${removedModifiers.count} obsolete cost modifier(s)`);
}

async function seedQuestions() {
  console.log("Seeding question definitions...");
  for (const q of questions) {
    await prisma.questionDefinition.upsert({
      where: { slug: q.slug },
      update: {
        label: q.label,
        type: q.type,
        required: q.required,
        sortOrder: q.sortOrder,
        options: q.options ?? undefined,
        validation: q.validation ?? undefined,
        unit: q.unit,
      },
      create: {
        slug: q.slug,
        label: q.label,
        type: q.type,
        required: q.required,
        sortOrder: q.sortOrder,
        options: q.options ?? undefined,
        validation: q.validation ?? undefined,
        unit: q.unit,
      },
    });
  }
  console.log(`  ✓ ${questions.length} question definitions upserted`);
}

async function seedStages() {
  console.log("Seeding construction stages...");
  for (const s of stages) {
    await prisma.constructionStage.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        description: s.description,
        coachingNote: null,
        category: s.category,
        sortOrder: s.sortOrder,
        completedByState: s.completedByState,
        predecessorSlugs: [...s.predecessorSlugs],
        costPerM2Economy: s.costPerM2Economy,
        costPerM2Standard: s.costPerM2Standard,
        costPerM2Premium: s.costPerM2Premium,
        durationMinDays: s.durationMinDays,
        durationMaxDays: s.durationMaxDays,
      },
      create: {
        slug: s.slug,
        name: s.name,
        description: s.description,
        coachingNote: null,
        category: s.category,
        sortOrder: s.sortOrder,
        completedByState: s.completedByState,
        predecessorSlugs: [...s.predecessorSlugs],
        costPerM2Economy: s.costPerM2Economy,
        costPerM2Standard: s.costPerM2Standard,
        costPerM2Premium: s.costPerM2Premium,
        durationMinDays: s.durationMinDays,
        durationMaxDays: s.durationMaxDays,
      },
    });
  }
  console.log(`  ✓ ${stages.length} construction stages upserted`);
}

async function seedModifiers() {
  console.log("Seeding cost modifiers...");
  let count = 0;

  for (const m of modifiers) {
    const stage = await prisma.constructionStage.findUnique({
      where: { slug: m.stageSlug },
    });
    if (!stage) {
      console.warn(`  ⚠ Stage "${m.stageSlug}" not found — skipping modifier`);
      continue;
    }

    const existing = await prisma.stageCostModifier.findFirst({
      where: {
        stageId: stage.id,
        triggerQuestionSlug: m.triggerQuestionSlug,
        triggerValue: m.triggerValue,
        description: m.description,
      },
    });

    if (existing) {
      await prisma.stageCostModifier.update({
        where: { id: existing.id },
        data: {
          costAdjustmentPerM2: m.costAdjustmentPerM2,
          fixedCostAdjustment: m.fixedCostAdjustment,
          description: m.description,
        },
      });
    } else {
      await prisma.stageCostModifier.create({
        data: {
          stageId: stage.id,
          triggerQuestionSlug: m.triggerQuestionSlug,
          triggerValue: m.triggerValue,
          costAdjustmentPerM2: m.costAdjustmentPerM2,
          fixedCostAdjustment: m.fixedCostAdjustment,
          description: m.description,
        },
      });
    }
    count++;
  }

  console.log(`  ✓ ${count} cost modifiers upserted`);
}

// ---------------------------------------------------------------------------
// Market benchmarks (S-04)
// ---------------------------------------------------------------------------

type MarketBenchmarkSeedRow = {
  stageCategory: string;
  multiplier: number;
  sourceName: string;
  sourceUrl?: string | null;
};

async function seedMarketBenchmarks() {
  console.log("Seeding market benchmarks...");
  const filePath = path.join(seedDir, "data/market-benchmarks.json");
  const raw = await readFile(filePath, "utf-8");
  const rows = JSON.parse(raw) as MarketBenchmarkSeedRow[];
  const fetchedAt = new Date();

  for (const row of rows) {
    await prisma.marketBenchmark.upsert({
      where: { stageCategory: row.stageCategory },
      create: {
        stageCategory: row.stageCategory,
        multiplier: row.multiplier,
        sourceName: row.sourceName,
        sourceUrl: row.sourceUrl ?? null,
        fetchedAt,
      },
      update: {
        multiplier: row.multiplier,
        sourceName: row.sourceName,
        sourceUrl: row.sourceUrl ?? null,
        fetchedAt,
      },
    });
  }

  console.log(`  ✓ ${rows.length} market benchmarks upserted`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Starting seed...\n");
  await cleanupObsoleteSeedData();
  await seedQuestions();
  await seedStages();
  await seedModifiers();
  await seedMarketBenchmarks();
  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
