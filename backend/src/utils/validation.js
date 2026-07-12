import { z } from 'zod';

const ROLES = ['ADMIN', 'MANAGER'];
const PROPERTY_TYPES = ['RESIDENTIAL', 'APARTMENT', 'COMMERCIAL'];
const PROPERTY_STATUS = ['ACTIVE', 'INACTIVE'];
const CATEGORIES = [
  'ROOFING', 'STRUCTURAL', 'ELECTRICAL', 'PLUMBING', 'HVAC',
  'FLOORING', 'PAINTING', 'SECURITY', 'LANDSCAPING', 'OTHER',
];
const REQUEST_STATUS = ['PENDING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'DEFERRED', 'REJECTED'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const enums = { ROLES, PROPERTY_TYPES, PROPERTY_STATUS, CATEGORIES, REQUEST_STATUS, SEVERITIES };

// Auth
export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

// Property 
export const propertySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  address: z.string().trim().min(1, 'Address is required'),
  propertyType: z.enum(PROPERTY_TYPES),
  units: z.coerce.number().int().min(1).default(1),
  yearBuilt: z.coerce.number().int().min(1800).max(2100).optional().nullable(),
  totalAreaSqm: z.coerce.number().min(0).optional().nullable(),
  description: z.string().trim().optional().nullable(),
  status: z.enum(PROPERTY_STATUS).default('ACTIVE'),
});

// Maintenance request.
// Two ways to supply the scoring inputs:
//  - Admin / "Edit Decision Ranking" path: explicit urgency/impact/assetImportance (1-10).
//  - Manager field-report path: a plain-language `severity` (+ optional safetyHazard),
//    which the controller maps to those same three numbers server-side.
// At least one of the two paths must be present; the schema itself stays permissive
// so both shapes validate, and the controller decides what to do with what's given.
export const requestSchema = z.object({
  propertyId: z.string().uuid('A property must be selected'),
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().optional().nullable(),
  category: z.enum(CATEGORIES),
  severity: z.enum(SEVERITIES).optional().nullable(),
  safetyHazard: z.coerce.boolean().optional().default(false),
  urgency: z.coerce.number().int().min(1).max(10).optional(),
  impact: z.coerce.number().int().min(1).max(10).optional(),
  assetImportance: z.coerce.number().int().min(1).max(10).optional(),
  estimatedCost: z.coerce.number().min(0),
  status: z.enum(REQUEST_STATUS).default('PENDING'),
  assignedTo: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
}).refine(
  (v) => v.severity || (v.urgency != null && v.impact != null && v.assetImportance != null),
  { message: 'Provide either a severity, or urgency/impact/assetImportance.', path: ['severity'] },
);

// Partial schema for updates (any subset of fields, no cross-field requirement —
// e.g. an admin re-ranking a request may only send { urgency: 9 }).
export const requestUpdateSchema = z.object({
  propertyId: z.string().uuid().optional(),
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  category: z.enum(CATEGORIES).optional(),
  severity: z.enum(SEVERITIES).optional().nullable(),
  safetyHazard: z.coerce.boolean().optional(),
  urgency: z.coerce.number().int().min(1).max(10).optional(),
  impact: z.coerce.number().int().min(1).max(10).optional(),
  assetImportance: z.coerce.number().int().min(1).max(10).optional(),
  estimatedCost: z.coerce.number().min(0).optional(),
  status: z.enum(REQUEST_STATUS).optional(),
  assignedTo: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

// Reject a maintenance request (admin decision, with a reason for the audit trail / manager view).
export const rejectSchema = z.object({
  reason: z.string().trim().min(1, 'A reason helps the manager understand the decision').optional(),
});

export const propertyUpdateSchema = propertySchema.partial();

// Fund
export const fundSchema = z.object({
  propertyId: z.string().uuid('A property must be selected'),
  totalAmount: z.coerce.number().min(0),
  periodLabel: z.string().trim().min(1, 'Period label is required (e.g. "Q1 2026")'),
});
export const fundUpdateSchema = fundSchema.partial();

// Allocation ("Approve Maintenance Request" — admin can edit the amount the
// DSS suggested before committing it).
export const allocationSchema = z.object({
  fundId: z.string().uuid(),
  requestId: z.string().uuid(),
  amountAssigned: z.coerce.number().positive('Amount must be greater than zero'),
  suggestedAmount: z.coerce.number().min(0).optional(),
  notes: z.string().trim().optional().nullable(),
});

// Adjust Funds — top up (or reduce) an already-approved allocation once real-world
// cost differs from the original estimate. A reason is required for the audit trail.
export const adjustAllocationSchema = z.object({
  newAmount: z.coerce.number().positive('Amount must be greater than zero'),
  reason: z.string().trim().min(1, 'A reason is required when adjusting released funds'),
});

// Assign / unassign a manager to a property.
export const assignManagerSchema = z.object({
  managerId: z.string().uuid('A manager must be selected'),
});
