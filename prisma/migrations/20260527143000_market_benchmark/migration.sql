-- CreateTable
CREATE TABLE "MarketBenchmark" (
    "id" TEXT NOT NULL,
    "stageCategory" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketBenchmark_stageCategory_key" ON "MarketBenchmark"("stageCategory");

-- AlterTable
ALTER TABLE "PlanVersion" ADD COLUMN "refinementApplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "benchmarkFetchedAt" TIMESTAMP(3),
ADD COLUMN "benchmarkSourceName" TEXT;
