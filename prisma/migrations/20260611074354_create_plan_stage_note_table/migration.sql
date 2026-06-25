-- CreateTable
CREATE TABLE "PlanStageNote" (
    "id" TEXT NOT NULL,
    "stageSlug" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "PlanStageNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanStageNote_planId_idx" ON "PlanStageNote"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanStageNote_planId_stageSlug_key" ON "PlanStageNote"("planId", "stageSlug");

-- AddForeignKey
ALTER TABLE "PlanStageNote" ADD CONSTRAINT "PlanStageNote_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
