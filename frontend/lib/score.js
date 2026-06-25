// Client-side mirror of the backend DSS formula — used only to show a live
// score preview in the request form. The backend remains the source of truth.
const CATEGORY_BOOST = {
  ROOFING: 2.0, STRUCTURAL: 1.8, ELECTRICAL: 1.5, PLUMBING: 1.2,
  SECURITY: 1.0, HVAC: 0.8, FLOORING: 0.0, LANDSCAPING: 0.0, OTHER: 0.0, PAINTING: -0.5,
};
const COST_NORMALISER = 500000;

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
