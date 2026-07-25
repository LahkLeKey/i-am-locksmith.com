ALTER TABLE "JobRecord" ADD COLUMN "jobName" TEXT;

UPDATE "JobRecord"
SET "jobName" = "customerName" || ' - ' || "site";

ALTER TABLE "JobRecord" ALTER COLUMN "jobName" SET NOT NULL;