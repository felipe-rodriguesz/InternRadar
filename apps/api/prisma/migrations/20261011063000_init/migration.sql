-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SourcePlatform" AS ENUM ('GREENHOUSE', 'ASHBY', 'LEVER');

-- CreateEnum
CREATE TYPE "SourceRegion" AS ENUM ('GLOBAL', 'EU');

-- CreateEnum
CREATE TYPE "WorkplaceType" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'POSSIBLY_CLOSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSource" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "platform" "SourcePlatform" NOT NULL,
    "boardKey" TEXT NOT NULL,
    "region" "SourceRegion" NOT NULL DEFAULT 'GLOBAL',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "JobSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jobSourceId" UUID NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "workplaceType" "WorkplaceType" NOT NULL DEFAULT 'UNKNOWN',
    "employmentType" TEXT,
    "jobUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(3),
    "firstSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jobSourceId" UUID NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobSource_companyId_idx" ON "JobSource"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "JobSource_platform_boardKey_region_key" ON "JobSource"("platform", "boardKey", "region");

-- CreateIndex
CREATE INDEX "Job_firstSeenAt_id_idx" ON "Job"("firstSeenAt", "id");

-- CreateIndex
CREATE INDEX "Job_workplaceType_idx" ON "Job"("workplaceType");

-- CreateIndex
CREATE UNIQUE INDEX "Job_jobSourceId_externalId_key" ON "Job"("jobSourceId", "externalId");

-- CreateIndex
CREATE INDEX "SyncRun_jobSourceId_startedAt_idx" ON "SyncRun"("jobSourceId", "startedAt");

-- AddForeignKey
ALTER TABLE "JobSource" ADD CONSTRAINT "JobSource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_jobSourceId_fkey" FOREIGN KEY ("jobSourceId") REFERENCES "JobSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_jobSourceId_fkey" FOREIGN KEY ("jobSourceId") REFERENCES "JobSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Regras da especificação que o schema Prisma não representa como CHECK/trigger.
ALTER TABLE "Company" ADD CONSTRAINT "Company_name_nonempty" CHECK (length(btrim("name")) > 0);
ALTER TABLE "Company" ADD CONSTRAINT "Company_website_http" CHECK ("websiteUrl" IS NULL OR "websiteUrl" ~ '^https?://[[:alnum:]][^[:space:]]*$');
ALTER TABLE "JobSource" ADD CONSTRAINT "JobSource_boardKey_nonempty" CHECK (length(btrim("boardKey")) > 0);
ALTER TABLE "Job" ADD CONSTRAINT "Job_required_text" CHECK (length(btrim("title")) > 0 AND length(btrim("externalId")) > 0);
ALTER TABLE "Job" ADD CONSTRAINT "Job_jobUrl_http" CHECK ("jobUrl" ~ '^https?://[[:alnum:]][^[:space:]]*$');
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_nonnegative_counts" CHECK ("fetchedCount" >= 0 AND "createdCount" >= 0 AND "updatedCount" >= 0 AND "skippedCount" >= 0);

CREATE FUNCTION reject_first_seen_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."firstSeenAt" IS DISTINCT FROM OLD."firstSeenAt" THEN
    RAISE EXCEPTION 'firstSeenAt is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Job_firstSeenAt_immutable" BEFORE UPDATE ON "Job"
FOR EACH ROW EXECUTE FUNCTION reject_first_seen_change();
