import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const benchmarkRowSchema = z.object({
  stageCategory: z.string().trim().min(1),
  multiplier: z.number().finite().positive(),
  sourceName: z.string().trim().min(1),
  sourceUrl: z.string().nullable().optional(),
});

const benchmarkFileSchema = z.array(benchmarkRowSchema).min(1);

type BenchmarkRow = z.infer<typeof benchmarkRowSchema>;

function parseBenchmarkRows(data: unknown): BenchmarkRow[] {
  const parsed = benchmarkFileSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Nieprawidłowy format benchmarków: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }
  return parsed.data;
}

async function loadRows(): Promise<BenchmarkRow[]> {
  const url = process.env.BENCHMARKS_JSON_URL;
  if (url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      throw new Error(
        `Nie udało się pobrać benchmarków (${response.status} ${response.statusText})`,
      );
    }
    return parseBenchmarkRows(await response.json());
  }

  const fileArg = process.argv[2];
  const filePath = fileArg
    ? path.resolve(process.cwd(), fileArg)
    : path.join(process.cwd(), "prisma/data/market-benchmarks.json");

  const raw = await readFile(filePath, "utf-8");
  return parseBenchmarkRows(JSON.parse(raw) as unknown);
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
