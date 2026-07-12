// Criteria weights: urgency dominates, cost is a mild penalty.
export const CRITERIA_WEIGHTS = Object.freeze({
  urgency: 0.35,
  impact: 0.30,
  assetImportance: 0.20,
  cost: 0.15,
});

export const CATEGORY_BOOST = Object.freeze({
  ROOFING: 2.0,
  STRUCTURAL: 1.8,
  ELECTRICAL: 1.5,
  PLUMBING: 1.2,
  SECURITY: 1.0,
  HVAC: 0.8,
  FLOORING: 0.0,
  LANDSCAPING: 0.0,
  OTHER: 0.0,
  PAINTING: -0.5,
});

export const COST_NORMALISER = 500000;

// Plain-language severity a manager picks in the field, mapped to the same
// urgency/impact/assetImportance inputs the DSS scores on. Admins still get
// direct numeric control (for "Edit Decision Ranking"); managers get this.
export const SEVERITY_SCORES = Object.freeze({
  LOW:      { urgency: 3,  impact: 3, assetImportance: 4 },
  MEDIUM:   { urgency: 5,  impact: 5, assetImportance: 5 },
  HIGH:     { urgency: 8,  impact: 7, assetImportance: 7 },
  CRITICAL: { urgency: 10, impact: 9, assetImportance: 8 },
});

// A reported safety hazard (e.g. exposed wiring, structural risk) nudges the
// urgency/impact inputs up regardless of the chosen severity label.
const SAFETY_BUMP = 2;

// Derives urgency/impact/assetImportance from a manager-chosen severity
// (+ optional safety flag). Falls back to MEDIUM if an unknown value slips through.
export function scoreInputsFromSeverity(severity, safetyHazard) {
  const base = SEVERITY_SCORES[severity] ?? SEVERITY_SCORES.MEDIUM;
  if (!safetyHazard) return { ...base };
  return {
    urgency: clamp(base.urgency + SAFETY_BUMP, 1, 10),
    impact: clamp(base.impact + SAFETY_BUMP, 1, 10),
    assetImportance: base.assetImportance,
  };
}

// score = urgency*0.35 + impact*0.30 + assetImportance*0.20 - costScore*0.15 + categoryBoost
export function computePriorityScore({ urgency, impact, assetImportance, estimatedCost, category }) {
  const u = clamp(Number(urgency), 1, 10);
  const i = clamp(Number(impact), 1, 10);
  const a = clamp(Number(assetImportance), 1, 10);
  const costScore = clamp(Number(estimatedCost) / COST_NORMALISER, 1, 10);
  const boost = CATEGORY_BOOST[category] ?? 0;

  const raw =
    u * CRITERIA_WEIGHTS.urgency +
    i * CRITERIA_WEIGHTS.impact +
    a * CRITERIA_WEIGHTS.assetImportance -
    costScore * CRITERIA_WEIGHTS.cost +
    boost;

  return round2(Math.max(0, raw));
}

// Highest score first; ties broken by lower cost, then older request.
export function rankRequests(requests) {
  return [...requests].sort((x, y) => {
    const sx = Number(x.priorityScore ?? computePriorityScore(x));
    const sy = Number(y.priorityScore ?? computePriorityScore(y));
    if (sy !== sx) return sy - sx;
    const cx = Number(x.estimatedCost);
    const cy = Number(y.estimatedCost);
    if (cx !== cy) return cx - cy;
    return new Date(x.createdAt ?? 0) - new Date(y.createdAt ?? 0);
  });
}

// Walk ranked requests and fund each that still fits the remaining budget,
// deferring the rest. Returns a per-request reason plus a summary.
export function recommendAllocation(requests, availableBudget) {
  const budget = Math.max(0, Number(availableBudget) || 0);
  const ranked = rankRequests(requests);

  let remaining = budget;
  let recommendedCount = 0;
  let recommendedTotal = 0;

  const recommendations = ranked.map((req, idx) => {
    const cost = Number(req.estimatedCost);
    const score = Number(req.priorityScore ?? computePriorityScore(req));
    const fits = cost <= remaining;

    let recommended = false;
    let reason;

    if (fits) {
      recommended = true;
      remaining -= cost;
      recommendedCount += 1;
      recommendedTotal += cost;
      reason = `Funded — rank #${idx + 1}, fits within remaining budget.`;
    } else {
      reason = `Deferred — cost (${cost.toLocaleString()}) exceeds remaining budget (${remaining.toLocaleString()}).`;
    }

    return {
      requestId: req.id,
      rank: idx + 1,
      title: req.title,
      category: req.category,
      priorityScore: round2(score),
      estimatedCost: cost,
      recommended,
      remainingAfter: round2(remaining),
      reason,
    };
  });

  return {
    recommendations,
    summary: {
      availableBudget: round2(budget),
      totalRequests: ranked.length,
      recommendedCount,
      deferredCount: ranked.length - recommendedCount,
      recommendedTotal: round2(recommendedTotal),
      budgetRemaining: round2(remaining),
      budgetUtilisation: budget > 0 ? round2((recommendedTotal / budget) * 100) : 0,
    },
  };
}

// Model configuration, so the UI / report can show how scores are derived.
export function getModelConfig() {
  return {
    weights: CRITERIA_WEIGHTS,
    categoryBoost: CATEGORY_BOOST,
    costNormaliser: COST_NORMALISER,
    formula:
      'score = urgency*0.35 + impact*0.30 + assetImportance*0.20 - costScore*0.15 + categoryBoost',
  };
}

function clamp(n, lo, hi) {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
