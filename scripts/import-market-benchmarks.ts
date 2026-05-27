import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type BenchmarkRow = {
  stageCategory: string;
  multiplier: number;
  sourceName: string;
  sourceUrl?: string | null;
};

async function loadRows(): Promise<BenchmarkRow[]> {
  const url = process.env.BENCHMARKS_JSON_URL;
  if (url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      throw new Error(
        `Nie udało się pobrać benchmarków (${response.status} ${response.statusText})`,
      );
    }
    return response.json() as Promise<BenchmarkRow[]>;
  }

  const fileArg = process.argv[2];
  const filePath = fileArg
    ? path.resolve(process.cwd(), fileArg)
    : path.join(process.cwd(), "prisma/data/market-benchmarks.json");

  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as BenchmarkRow[];
}

async function main() {
  const rows = await loadRows();
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

  console.log(`✓ Zaimportowano ${rows.length} benchmarków (stan: ${fetchedAt.toISOString()})`);
}

main()
  .catch((error) => {
    console.error("❌ Import benchmarków nie powiódł się:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
