-- Create custom types for the database
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER');

CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL', 'APARTMENT', 'COMMERCIAL');

CREATE TYPE "PropertyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE "Category" AS ENUM (
  'ROOFING',
  'STRUCTURAL',
  'ELECTRICAL',
  'PLUMBING',
  'HVAC',
  'FLOORING',
  'PAINTING',
  'SECURITY',
  'LANDSCAPING',
  'OTHER'
);

CREATE TYPE "RequestStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'IN_PROGRESS',
  'COMPLETED',
  'DEFERRED',
  'REJECTED'
);

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'MANAGER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

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

CREATE TABLE "maintenance_requests" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" "Category" NOT NULL,
  "urgency" INTEGER NOT NULL,
  "impact" INTEGER NOT NULL,
  "assetImportance" INTEGER NOT NULL,
  "estimatedCost" DECIMAL(12,2) NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "priorityScore" DECIMAL(6,2),
  "requestedById" TEXT,
  "assignedTo" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

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

CREATE TABLE "fund_allocations" (
  "id" TEXT NOT NULL,
  "fundId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "amountAssigned" DECIMAL(12,2) NOT NULL,
  "allocationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "allocatedById" TEXT,
  "notes" TEXT,

  CONSTRAINT "fund_allocations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE INDEX "maintenance_requests_propertyId_idx" ON "maintenance_requests"("propertyId");
CREATE INDEX "maintenance_requests_status_idx" ON "maintenance_requests"("status");
CREATE INDEX "maintenance_funds_propertyId_idx" ON "maintenance_funds"("propertyId");
CREATE INDEX "fund_allocations_fundId_idx" ON "fund_allocations"("fundId");
CREATE INDEX "fund_allocations_requestId_idx" ON "fund_allocations"("requestId");

ALTER TABLE "properties"
  ADD CONSTRAINT "properties_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "maintenance_requests"
  ADD CONSTRAINT "maintenance_requests_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "properties"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "maintenance_requests"
  ADD CONSTRAINT "maintenance_requests_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "maintenance_funds"
  ADD CONSTRAINT "maintenance_funds_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "properties"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fund_allocations"
  ADD CONSTRAINT "fund_allocations_fundId_fkey"
  FOREIGN KEY ("fundId") REFERENCES "maintenance_funds"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fund_allocations"
  ADD CONSTRAINT "fund_allocations_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "maintenance_requests"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fund_allocations"
  ADD CONSTRAINT "fund_allocations_allocatedById_fkey"
  FOREIGN KEY ("allocatedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

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