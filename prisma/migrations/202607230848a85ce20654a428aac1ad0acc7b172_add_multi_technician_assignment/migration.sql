-- AlterTable
ALTER TABLE "JobRecord" ADD COLUMN     "assignedTechnicianIds" JSONB NOT NULL DEFAULT '[]';

-- Backfill the new JSON column from the legacy single-technician column when present.
UPDATE "JobRecord"
SET "assignedTechnicianIds" = to_jsonb(ARRAY["assignedTechnicianId"]::text[])
WHERE "assignedTechnicianId" IS NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "JobRecord_orgId_assignedTechnicianId_idx";

-- AlterTable
ALTER TABLE "JobRecord" DROP COLUMN "assignedTechnicianId";
