// Shared metadata for enums — labels and colours used across the UI.

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const CATEGORIES = {
  ROOFING: { label: 'Roofing', color: '#dc2626' },
  STRUCTURAL: { label: 'Structural', color: '#ea580c' },
  ELECTRICAL: { label: 'Electrical', color: '#ca8a04' },
  PLUMBING: { label: 'Plumbing', color: '#0ea5e9' },
  HVAC: { label: 'HVAC', color: '#6366f1' },
  SECURITY: { label: 'Security', color: '#7c3aed' },
  FLOORING: { label: 'Flooring', color: '#78716c' },
  PAINTING: { label: 'Painting', color: '#94a3b8' },
  LANDSCAPING: { label: 'Landscaping', color: '#16a34a' },
  OTHER: { label: 'Other', color: '#64748b' },
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORIES).map(([value, m]) => ({
  value,
  label: m.label,
}));

export const STATUSES = {
  PENDING: { label: 'Pending', color: '#ca8a04', bg: 'rgba(202,138,4,0.12)' },
  APPROVED: { label: 'Approved', color: '#15803d', bg: 'rgba(21,128,61,0.12)' },
  IN_PROGRESS: { label: 'In Progress', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  COMPLETED: { label: 'Completed', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  DEFERRED: { label: 'Deferred', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
  REJECTED: { label: 'Rejected', color: '#78716c', bg: 'rgba(120,113,108,0.12)' },
};

export const STATUS_OPTIONS = Object.entries(STATUSES).map(([value, m]) => ({ value, label: m.label }));

export const PROPERTY_TYPES = {
  RESIDENTIAL: { label: 'Residential' },
  APARTMENT: { label: 'Apartment' },
  COMMERCIAL: { label: 'Commercial' },
};

export const PROPERTY_TYPE_OPTIONS = Object.entries(PROPERTY_TYPES).map(([value, m]) => ({
  value,
  label: m.label,
}));
