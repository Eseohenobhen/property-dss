-- ============================================================================
-- PropertyDSS — full schema for a BRAND-NEW Supabase / Postgres database
-- ============================================================================
-- Use this ONLY on an empty database to create everything from scratch (all 7
-- tables + enums, matching backend/prisma/schema.prisma exactly).
--
--   *** If your prod database ALREADY has the original 5 tables with data,
--       do NOT run this file — it will error on "already exists" and the admin
--       INSERT at the bottom would create a duplicate admin. Run the
--       incremental upgrade instead: prisma/migrate-supabase-v2.sql ***
--
-- The schema portion below is generated from the Prisma schema, so applying it
-- leaves the DB exactly in sync with what the deployed backend expects.
-- The admin-user block is separate and lives at the very bottom.
-- ============================================================================

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL', 'APARTMENT', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('ROOFING', 'STRUCTURAL', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'FLOORING', 'PAINTING', 'SECURITY', 'LANDSCAPING', 'OTHER');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'DEFERRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "yearBuilt" INTEGER,
    "totalAreaSqm" DECIMAL(10,2),
    "description" TEXT,
    "status" "PropertyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_assignments" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "Category" NOT NULL,
    "severity" "Severity",
    "safetyHazard" BOOLEAN NOT NULL DEFAULT false,
    "urgency" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "assetImportance" INTEGER NOT NULL,
    "estimatedCost" DECIMAL(12,2) NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "priorityScore" DECIMAL(6,2),
    "requestedById" TEXT,
    "assignedTo" TEXT,
    "notes" TEXT,
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_funds" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allocatedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "periodLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_allocations" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "amountAssigned" DECIMAL(12,2) NOT NULL,
    "suggestedAmount" DECIMAL(12,2),
    "allocationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocatedById" TEXT,
    "notes" TEXT,

    CONSTRAINT "fund_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_adjustments" (
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
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "property_assignments_propertyId_idx" ON "property_assignments"("propertyId");

-- CreateIndex
CREATE INDEX "property_assignments_managerId_idx" ON "property_assignments"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "property_assignments_propertyId_managerId_key" ON "property_assignments"("propertyId", "managerId");

-- CreateIndex
CREATE INDEX "maintenance_requests_propertyId_idx" ON "maintenance_requests"("propertyId");

-- CreateIndex
CREATE INDEX "maintenance_requests_status_idx" ON "maintenance_requests"("status");

-- CreateIndex
CREATE INDEX "maintenance_funds_propertyId_idx" ON "maintenance_funds"("propertyId");

-- CreateIndex
CREATE INDEX "fund_allocations_fundId_idx" ON "fund_allocations"("fundId");

-- CreateIndex
CREATE INDEX "fund_allocations_requestId_idx" ON "fund_allocations"("requestId");

-- CreateIndex
CREATE INDEX "fund_adjustments_allocationId_idx" ON "fund_adjustments"("allocationId");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_assignments" ADD CONSTRAINT "property_assignments_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_assignments" ADD CONSTRAINT "property_assignments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_assignments" ADD CONSTRAINT "property_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_funds" ADD CONSTRAINT "maintenance_funds_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "maintenance_funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_allocatedById_fkey" FOREIGN KEY ("allocatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_adjustments" ADD CONSTRAINT "fund_adjustments_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "fund_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_adjustments" ADD CONSTRAINT "fund_adjustments_adjustedById_fkey" FOREIGN KEY ("adjustedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- ADMIN USER (separate from the schema above)
-- ============================================================================
-- Optional: create a first admin user after the schema is in place.
-- Replace the email, name, and password before running this block.
-- Supabase/Postgres uses pgcrypto here to hash the password inside SQL.
-- If pgcrypto is already enabled, the CREATE EXTENSION line is safe to keep.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "users" ("id", "email", "passwordHash", "fullName", "role", "createdAt")
VALUES (
  gen_random_uuid()::text,
  'admin@example.com',
  crypt('put your preferred password here', gen_salt('bf')),
  'Admin User',
  'ADMIN',
  NOW()
);
