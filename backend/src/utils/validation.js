import { z } from 'zod';

const ROLES = ['ADMIN', 'MANAGER'];
const PROPERTY_TYPES = ['RESIDENTIAL', 'APARTMENT', 'COMMERCIAL'];
const PROPERTY_STATUS = ['ACTIVE', 'INACTIVE'];
const CATEGORIES = [
  'ROOFING', 'STRUCTURAL', 'ELECTRICAL', 'PLUMBING', 'HVAC',
  'FLOORING', 'PAINTING', 'SECURITY', 'LANDSCAPING', 'OTHER',
];
const REQUEST_STATUS = ['PENDING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'DEFERRED', 'REJECTED'];

export const enums = { ROLES, PROPERTY_TYPES, PROPERTY_STATUS, CATEGORIES, REQUEST_STATUS };

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

// Maintenance request
export const requestSchema = z.object({
  propertyId: z.string().uuid('A property must be selected'),
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().optional().nullable(),
  category: z.enum(CATEGORIES),
  urgency: z.coerce.number().int().min(1).max(10),
  impact: z.coerce.number().int().min(1).max(10),
  assetImportance: z.coerce.number().int().min(1).max(10),
  estimatedCost: z.coerce.number().min(0),
  status: z.enum(REQUEST_STATUS).default('PENDING'),
  assignedTo: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

// Partial schema for updates (any subset of fields).
export const requestUpdateSchema = requestSchema.partial();
export const propertyUpdateSchema = propertySchema.partial();

// Fund
export const fundSchema = z.object({
  propertyId: z.string().uuid('A property must be selected'),
  totalAmount: z.coerce.number().min(0),
  periodLabel: z.string().trim().min(1, 'Period label is required (e.g. "Q1 2026")'),
});
export const fundUpdateSchema = fundSchema.partial();

// Allocation 
export const allocationSchema = z.object({
  fundId: z.string().uuid(),
  requestId: z.string().uuid(),
  amountAssigned: z.coerce.number().positive('Amount must be greater than zero'),
  notes: z.string().trim().optional().nullable(),
});
