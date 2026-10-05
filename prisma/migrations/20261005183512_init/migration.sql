-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "InvestigationStatus" AS ENUM ('RECEIVED', 'QUEUED', 'RUNNING', 'COLLECTING_EVIDENCE', 'ANALYZING', 'VALIDATING', 'REPORT_READY', 'PUBLISHED', 'INSUFFICIENT_EVIDENCE', 'REVIEW_REQUIRED', 'RETRY_WAIT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Investigation" (
    "id" TEXT NOT NULL,
    "jiraIssueKey" TEXT NOT NULL,
    "issueUpdatedAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "InvestigationStatus" NOT NULL DEFAULT 'RECEIVED',
    "stage" TEXT NOT NULL DEFAULT 'received',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "repositoryId" TEXT,
    "selectedSha" TEXT,
    "occurredFrom" TIMESTAMP(3),
    "occurredTo" TIMESTAMP(3),
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "failureCategory" TEXT,
    "failureSummary" TEXT,
    "configVersion" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Investigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceUri" TEXT,
    "occurredAt" TIMESTAMP(3),
    "repoSha" TEXT,
    "path" TEXT,
    "lineStart" INTEGER,
    "lineEnd" INTEGER,
    "contentHash" TEXT NOT NULL,
    "redactionStatus" TEXT NOT NULL DEFAULT 'redacted',
    "reliability" TEXT NOT NULL DEFAULT 'unknown',
    "limitations" TEXT,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL DEFAULT '1.0',
    "reportJson" JSONB NOT NULL,
    "renderedComment" TEXT,
    "validationStatus" TEXT NOT NULL,
    "publishedCommentId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publicationIdempotencyKey" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "tokenUsage" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Investigation_idempotencyKey_key" ON "Investigation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Investigation_jiraIssueKey_createdAt_idx" ON "Investigation"("jiraIssueKey", "createdAt");

-- CreateIndex
CREATE INDEX "Investigation_status_updatedAt_idx" ON "Investigation"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Evidence_investigationId_source_idx" ON "Evidence"("investigationId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "Report_publicationIdempotencyKey_key" ON "Report"("publicationIdempotencyKey");

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

