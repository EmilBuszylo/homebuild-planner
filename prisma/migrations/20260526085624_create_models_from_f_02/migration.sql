-- CreateEnum
CREATE TYPE "InvestmentState" AS ENUM ('FROM_SCRATCH', 'FOUNDATIONS', 'OPEN_SHELL', 'CLOSED_SHELL', 'DEVELOPER');

-- CreateEnum
CREATE TYPE "BuildStandard" AS ENUM ('ECONOMY', 'STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "InsulationLevel" AS ENUM ('STANDARD', 'ENHANCED', 'PASSIVE');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SINGLE_CHOICE', 'BOOLEAN');

-- CreateTable
CREATE TABLE "QuestionDefinition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "required" BOOLEAN NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "options" JSONB,
    "validation" JSONB,
    "unit" TEXT,

    CONSTRAINT "QuestionDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConstructionStage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "completedByState" "InvestmentState",
    "predecessorSlugs" TEXT[],
    "costPerM2Economy" DOUBLE PRECISION NOT NULL,
    "costPerM2Standard" DOUBLE PRECISION NOT NULL,
    "costPerM2Premium" DOUBLE PRECISION NOT NULL,
    "durationMinDays" INTEGER NOT NULL,
    "durationMaxDays" INTEGER NOT NULL,

    CONSTRAINT "ConstructionStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageCostModifier" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "triggerQuestionSlug" TEXT NOT NULL,
    "triggerValue" TEXT NOT NULL,
    "costAdjustmentPerM2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fixedCostAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,

    CONSTRAINT "StageCostModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanVersion" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireResponse" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "questionSlug" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "QuestionnaireResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanStageResult" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "stageSlug" TEXT NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL,
    "startDay" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "PlanStageResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionDefinition_slug_key" ON "QuestionDefinition"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ConstructionStage_slug_key" ON "ConstructionStage"("slug");

-- CreateIndex
CREATE INDEX "StageCostModifier_stageId_idx" ON "StageCostModifier"("stageId");

-- CreateIndex
CREATE INDEX "Plan_userId_idx" ON "Plan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanVersion_planId_versionNumber_key" ON "PlanVersion"("planId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireResponse_planVersionId_questionSlug_key" ON "QuestionnaireResponse"("planVersionId", "questionSlug");

-- CreateIndex
CREATE INDEX "PlanStageResult_planVersionId_idx" ON "PlanStageResult"("planVersionId");

-- AddForeignKey
ALTER TABLE "StageCostModifier" ADD CONSTRAINT "StageCostModifier_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ConstructionStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanStageResult" ADD CONSTRAINT "PlanStageResult_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
