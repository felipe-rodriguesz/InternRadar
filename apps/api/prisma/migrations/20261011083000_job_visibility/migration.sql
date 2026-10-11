-- Explicit visibility supplied by public providers; existing rows remain listed.
ALTER TABLE "Job" ADD COLUMN "isListed" BOOLEAN NOT NULL DEFAULT true;
