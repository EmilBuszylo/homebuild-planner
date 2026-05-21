-- CreateTable
CREATE TABLE "DbHealth" (
    "id" INTEGER NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DbHealth_pkey" PRIMARY KEY ("id")
);
