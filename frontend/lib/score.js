// Client-side mirror of the backend DSS formula — used only to show a live
// score preview in the request form. The backend remains the source of truth.
const CATEGORY_BOOST = {
  ROOFING: 2.0, STRUCTURAL: 1.8, ELECTRICAL: 1.5, PLUMBING: 1.2,
  SECURITY: 1.0, HVAC: 0.8, FLOORING: 0.0, LANDSCAPING: 0.0, OTHER: 0.0, PAINTING: -0.5,
};
const COST_NORMALISER = 500000;

// Mirrors services/dss.js#SEVERITY_SCORES / scoreInputsFromSeverity on the backend.
const SEVERITY_SCORES = {
  LOW: { urgency: 3, impact: 3, assetImportance: 4 },
  MEDIUM: { urgency: 5, impact: 5, assetImportance: 5 },
  HIGH: { urgency: 8, impact: 7, assetImportance: 7 },
  CRITICAL: { urgency: 10, impact: 9, assetImportance: 8 },
};
const SAFETY_BUMP = 2;

export function scoreInputsFromSeverity(severity, safetyHazard) {
  const base = SEVERITY_SCORES[severity] ?? SEVERITY_SCORES.MEDIUM;
  if (!safetyHazard) return { ...base };
  return {
    urgency: clamp(base.urgency + SAFETY_BUMP, 1, 10),
    impact: clamp(base.impact + SAFETY_BUMP, 1, 10),
    assetImportance: base.assetImportance,
  };
}

export function previewScore({ urgency, impact, assetImportance, estimatedCost, category }) {
  const u = clamp(Number(urgency), 1, 10);
  const i = clamp(Number(impact), 1, 10);
  const a = clamp(Number(assetImportance), 1, 10);
  const cost = clamp(Number(estimatedCost) / COST_NORMALISER, 1, 10);
  const boost = CATEGORY_BOOST[category] ?? 0;
  const raw = u * 0.35 + i * 0.3 + a * 0.2 - cost * 0.15 + boost;
  return Math.max(0, Math.round((raw + Number.EPSILON) * 100) / 100).toFixed(2);
}

function clamp(n, lo, hi) {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
