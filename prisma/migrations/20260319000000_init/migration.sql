-- CreateEnum
CREATE TYPE "SignalStatus" AS ENUM ('no_signal', 'watch', 'signal');

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "venue" TEXT NOT NULL,
    "category" TEXT,
    "marketUrl" TEXT NOT NULL,
    "resolutionDate" TIMESTAMP(3),
    "currentProbability" DECIMAL(5,4) NOT NULL,
    "lastPolledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceItem" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "trustScore" DECIMAL(3,2) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "summary" TEXT NOT NULL,
    "relevanceScore" DECIMAL(3,2) NOT NULL,
    "rawContent" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "currentProbability" DECIMAL(5,4) NOT NULL,
    "fairProbability" DECIMAL(5,4) NOT NULL,
    "edge" DECIMAL(5,4) NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "status" "SignalStatus" NOT NULL,
    "thesis" TEXT NOT NULL,
    "reasonCodes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "IngestionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Market_externalId_key" ON "Market"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceItem_dedupeKey_key" ON "EvidenceItem"("dedupeKey");

-- CreateIndex
CREATE INDEX "EvidenceItem_marketId_createdAt_idx" ON "EvidenceItem"("marketId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Signal_marketId_createdAt_idx" ON "Signal"("marketId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
