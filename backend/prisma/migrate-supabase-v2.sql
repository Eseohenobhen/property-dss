-- ============================================================================
-- PropertyDSS — Supabase production migration v2
-- ============================================================================
-- RUN THIS on an EXISTING prod database that already has the original 5 tables
-- (users, properties, maintenance_requests, maintenance_funds, fund_allocations).
--
-- It ONLY ADDS the new feature schema — it never drops or empties anything, so
-- your existing production data is preserved:
--   * new "Severity" enum
--   * new columns on maintenance_requests + fund_allocations
--   * two new tables: property_assignments, fund_adjustments
--
-- How to use: paste the whole file into the Supabase SQL editor and Run.
-- It is idempotent (safe to run more than once) thanks to the IF NOT EXISTS
-- guards, so a re-run or an interrupted paste won't break anything.
--
-- This is the hand-safe version of the exact SQL that `prisma migrate diff`
-- produces for the old -> new schema, so afterwards `prisma db push` against
-- this database will report it is already in sync.
-- ============================================================================

-- CreateEnum: "Severity" (CREATE TYPE has no IF NOT EXISTS, so guard it)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Severity') THEN
    CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  END IF;
END$$;

-- AlterTable: maintenance_requests — new manager/severity/review columns
ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "severity" "Severity";
ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "safetyHazard" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;
ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

-- AlterTable: fund_allocations — keep the original DSS suggestion alongside the
-- amount actually released, so Adjust Funds can show "suggested vs released".
ALTER TABLE "fund_allocations" ADD COLUMN IF NOT EXISTS "suggestedAmount" DECIMAL(12,2);

-- CreateTable: property_assignments (manager <-> property, many-to-many)
CREATE TABLE IF NOT EXISTS "property_assignments" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: fund_adjustments (audit trail for every top-up / reduction)
CREATE TABLE IF NOT EXISTS "fund_adjustments" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "previousAmount" DECIMAL(12,2) NOT NULL,
    "newAmount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "adjustedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "property_assignments_propertyId_idx" ON "property_assignments"("propertyId");
CREATE INDEX IF NOT EXISTS "property_assignments_managerId_idx" ON "property_assignments"("managerId");
CREATE UNIQUE INDEX IF NOT EXISTS "property_assignments_propertyId_managerId_key" ON "property_assignments"("propertyId", "managerId");
CREATE INDEX IF NOT EXISTS "fund_adjustments_allocationId_idx" ON "fund_adjustments"("allocationId");

-- AddForeignKey (ADD CONSTRAINT has no IF NOT EXISTS, so guard each by name)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_assignments_propertyId_fkey') THEN
    ALTER TABLE "property_assignments" ADD CONSTRAINT "property_assignments_propertyId_fkey"
      FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_assignments_managerId_fkey') THEN
    ALTER TABLE "property_assignments" ADD CONSTRAINT "property_assignments_managerId_fkey"
      FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_assignments_assignedById_fkey') THEN
    ALTER TABLE "property_assignments" ADD CONSTRAINT "property_assignments_assignedById_fkey"
      FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_requests_reviewedById_fkey') THEN
    ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fund_adjustments_allocationId_fkey') THEN
    ALTER TABLE "fund_adjustments" ADD CONSTRAINT "fund_adjustments_allocationId_fkey"
      FOREIGN KEY ("allocationId") REFERENCES "fund_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fund_adjustments_adjustedById_fkey') THEN
    ALTER TABLE "fund_adjustments" ADD CONSTRAINT "fund_adjustments_adjustedById_fkey"
      FOREIGN KEY ("adjustedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
