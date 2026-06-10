import { readFileSync } from "node:fs";
import path from "node:path";

export type SeedStageRates = {
  costPerM2Economy: number;
  costPerM2Standard: number;
  costPerM2Premium: number;
};

export type SeedModifierEntry = {
  stageSlug: string;
  triggerQuestionSlug: string;
  triggerValue: string;
  costAdjustmentPerM2: number;
  fixedCostAdjustment: number;
  description: string;
};

const REPO_ROOT = path.resolve(import.meta.dirname, "../../../..");

function readSeedSource(): string {
  return readFileSync(path.join(REPO_ROOT, "prisma/seed.ts"), "utf8");
}

function extractSection(source: string, start: string, end: string): string {
  const startIdx = source.indexOf(start);
  if (startIdx === -1) {
    throw new Error(`Missing seed section: ${start}`);
  }
  const from = startIdx + start.length;
  const endIdx = source.indexOf(end, from);
  if (endIdx === -1) {
    throw new Error(`Missing seed section end: ${end}`);
  }
  return source.slice(from, endIdx);
}

/** Parse stage PLN/m² tiers from `prisma/seed.ts` without importing the seed module. */
export function parseSeedStageRates(): Map<string, SeedStageRates> {
  const source = readSeedSource();
  const section = extractSection(source, "const stages = [", "] as const;");
  const rates = new Map<string, SeedStageRates>();
  const re =
    /slug:\s*"([^"]+)"[\s\S]*?costPerM2Economy:\s*(\d+)[\s\S]*?costPerM2Standard:\s*(\d+)[\s\S]*?costPerM2Premium:\s*(\d+)/g;

  for (const match of section.matchAll(re)) {
    rates.set(match[1], {
      costPerM2Economy: Number(match[2]),
      costPerM2Standard: Number(match[3]),
      costPerM2Premium: Number(match[4]),
    });
  }

  return rates;
}

function parseDescription(raw: string): string {
  const inline = raw.match(/^"([^"]*)"/);
  if (inline) {
    return inline[1];
  }
  const multiline = raw.match(/\n\s*"([^"]*)"/);
  return multiline?.[1] ?? raw.trim();
}

/** Parse all modifier rows from `prisma/seed.ts` (supports duplicate trigger tuples). */
export function parseSeedModifierList(): SeedModifierEntry[] {
  const source = readSeedSource();
  const section = extractSection(
    source,
    "const modifiers: ModifierInput[] = [",
    "];\n\n// ---------------------------------------------------------------------------\n// Seed functions",
  );
  const modifiers: SeedModifierEntry[] = [];
  const re =
    /stageSlug:\s*"([^"]+)"[\s\S]*?triggerQuestionSlug:\s*"([^"]+)"[\s\S]*?triggerValue:\s*"([^"]+)"[\s\S]*?costAdjustmentPerM2:\s*(-?\d+)[\s\S]*?fixedCostAdjustment:\s*(-?\d+)[\s\S]*?description:\s*([\s\S]*?)(?=\n\s*},|\n\s*{)/g;

  for (const match of section.matchAll(re)) {
    modifiers.push({
      stageSlug: match[1],
      triggerQuestionSlug: match[2],
      triggerValue: match[3],
      costAdjustmentPerM2: Number(match[4]),
      fixedCostAdjustment: Number(match[5]),
      description: parseDescription(match[6]),
    });
  }

  return modifiers;
}
