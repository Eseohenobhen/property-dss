// Unit test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computePriorityScore,
  rankRequests,
  recommendAllocation,
  CRITERIA_WEIGHTS,
} from '../src/services/dss.js';

//  Fixtures mirroring the seeded Sunrise Estate scenario
const roof = {
  id: 'roof', title: 'Leaking roof', category: 'ROOFING',
  urgency: 9, impact: 8, assetImportance: 9, estimatedCost: 450000,
};
const wall = {
  id: 'wall', title: 'Cracked load-bearing wall', category: 'STRUCTURAL',
  urgency: 8, impact: 9, assetImportance: 10, estimatedCost: 1200000,
};
const paint = {
  id: 'paint', title: 'Repaint corridor', category: 'PAINTING',
  urgency: 2, impact: 2, assetImportance: 3, estimatedCost: 180000,
};

// computePriorityScore: exact, hand-checked values 
test('weights sum to 1', () => {
  const sum = Object.values(CRITERIA_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.equal(Math.round(sum * 100) / 100, 1);
});

test('scores a high-priority roof leak correctly', () => {
  // 9*.35 + 8*.30 + 9*.20 - 1*.15 + 2.0(ROOFING) = 9.20
  assert.equal(computePriorityScore(roof), 9.2);
});

test('scores a structural wall correctly', () => {
  // 8*.35 + 9*.30 + 10*.20 - 2.4*.15 + 1.8(STRUCTURAL) = 8.94
  assert.equal(computePriorityScore(wall), 8.94);
});

test('applies the negative boost to cosmetic painting', () => {
  // 2*.35 + 2*.30 + 3*.20 - 1*.15 - 0.5(PAINTING) = 1.25
  assert.equal(computePriorityScore(paint), 1.25);
});

test('score is never negative (floored at 0)', () => {
  const trivial = { category: 'PAINTING', urgency: 1, impact: 1, assetImportance: 1, estimatedCost: 0 };
  assert.ok(computePriorityScore(trivial) >= 0);
});

test('higher urgency always raises the score, all else equal', () => {
  const base = { category: 'OTHER', urgency: 3, impact: 5, assetImportance: 5, estimatedCost: 100000 };
  const urgent = { ...base, urgency: 9 };
  assert.ok(computePriorityScore(urgent) > computePriorityScore(base));
});

test('higher cost lowers the score, all else equal', () => {
  const cheap = { category: 'OTHER', urgency: 5, impact: 5, assetImportance: 5, estimatedCost: 500000 };
  const pricey = { ...cheap, estimatedCost: 5000000 };
  assert.ok(computePriorityScore(pricey) < computePriorityScore(cheap));
});

// rankRequests
test('ranks requests by score, highest first', () => {
  const ranked = rankRequests([paint, roof, wall]);
  assert.deepEqual(ranked.map((r) => r.id), ['roof', 'wall', 'paint']);
});

test('breaks ties by lower cost', () => {
  const a = { id: 'a', category: 'OTHER', urgency: 5, impact: 5, assetImportance: 5, estimatedCost: 800000 };
  const b = { id: 'b', category: 'OTHER', urgency: 5, impact: 5, assetImportance: 5, estimatedCost: 200000 };
  const ranked = rankRequests([a, b]);
  assert.deepEqual(ranked.map((r) => r.id), ['b', 'a']); // equal score, cheaper first
});

// recommendAllocation (greedy, budget-aware)  
test('funds top requests within budget and defers what does not fit', () => {
  const { recommendations, summary } = recommendAllocation([roof, wall, paint], 1500000);

  const byId = Object.fromEntries(recommendations.map((r) => [r.requestId, r]));
  assert.equal(byId.roof.recommended, true);   // 450k fits (remaining 1.05M)
  assert.equal(byId.wall.recommended, false);  // 1.2M no longer fits
  assert.equal(byId.paint.recommended, true);  // 180k still fits

  assert.equal(summary.recommendedCount, 2);
  assert.equal(summary.deferredCount, 1);
  assert.equal(summary.recommendedTotal, 630000);
  assert.equal(summary.budgetRemaining, 870000);
  assert.equal(summary.budgetUtilisation, 42);
});

test('recommends nothing when the budget is zero', () => {
  const { summary } = recommendAllocation([roof, wall, paint], 0);
  assert.equal(summary.recommendedCount, 0);
  assert.equal(summary.deferredCount, 3);
});

test('assigns ranks 1..n in priority order', () => {
  const { recommendations } = recommendAllocation([paint, roof, wall], 1500000);
  assert.deepEqual(recommendations.map((r) => r.rank), [1, 2, 3]);
  assert.equal(recommendations[0].title, 'Leaking roof');
});

test('never recommends more than the available budget', () => {
  const { summary } = recommendAllocation([roof, wall, paint], 1500000);
  assert.ok(summary.recommendedTotal <= 1500000);
});
