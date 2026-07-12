import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../middleware/error.js';
import { ok } from '../utils/serialize.js';
import { requestSchema, requestUpdateSchema, rejectSchema } from '../utils/validation.js';
import { computePriorityScore, rankRequests, getModelConfig, scoreInputsFromSeverity } from '../services/dss.js';
import { getManagedPropertyIds } from '../services/access.js';

const requestInclude = {
  property: { select: { id: true, name: true } },
  requestedBy: { select: { fullName: true } },
  reviewedBy: { select: { fullName: true } },
  allocations: { select: { id: true, amountAssigned: true, suggestedAmount: true, allocationDate: true } },
};

// Managers are always scoped to their assigned properties. Returns null when
// the caller is an admin (i.e. "no restriction"), otherwise the allowed id list.
async function scopeForUser(user) {
  if (user.role !== 'MANAGER') return null;
  return getManagedPropertyIds(user.id);
}

export const listRequests = asyncHandler(async (req, res) => {
  const { propertyId, status, category, search } = req.query;
  const where = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (search) where.title = { contains: search, mode: 'insensitive' };

  const scope = await scopeForUser(req.user);
  if (scope) {
    // A manager can never see another property's requests, no matter what
    // propertyId query param is passed in.
    where.propertyId = propertyId && scope.includes(propertyId) ? propertyId : { in: scope };
  } else if (propertyId) {
    where.propertyId = propertyId;
  }

  const requests = await prisma.maintenanceRequest.findMany({
    where,
    orderBy: { priorityScore: 'desc' },
    include: requestInclude,
  });
  ok(res, requests);
});

export const getRequest = asyncHandler(async (req, res) => {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
    include: { ...requestInclude, allocations: { include: { adjustments: true } } },
  });
  if (!request) throw new ApiError(404, 'Request not found.');

  const scope = await scopeForUser(req.user);
  if (scope && !scope.includes(request.propertyId)) {
    throw new ApiError(403, 'You are not assigned to this property.');
  }
  ok(res, request);
});

export const createRequest = asyncHandler(async (req, res) => {
  const input = requestSchema.parse(req.body);

  if (req.user.role === 'MANAGER') {
    const scope = await getManagedPropertyIds(req.user.id);
    if (!scope.includes(input.propertyId)) {
      throw new ApiError(403, 'You can only log maintenance requests for a property you are assigned to.');
    }
    // A manager reports an issue; they don't get to decide its own approval status.
    input.status = 'PENDING';
    delete input.assignedTo;
  }

  // Fill in urgency/impact/assetImportance from the severity label whenever
  // they weren't explicitly supplied (the manager field-report path).
  const needsDerivedScore = input.urgency == null || input.impact == null || input.assetImportance == null;
  if (needsDerivedScore) {
    const derived = scoreInputsFromSeverity(input.severity, input.safetyHazard);
    input.urgency = input.urgency ?? derived.urgency;
    input.impact = input.impact ?? derived.impact;
    input.assetImportance = input.assetImportance ?? derived.assetImportance;
  }

  // The decision engine scores the request on the server before it is saved.
  const priorityScore = computePriorityScore(input);

  const request = await prisma.maintenanceRequest.create({
    data: { ...input, priorityScore, requestedById: req.user.id },
    include: requestInclude,
  });
  ok(res, request, 201);
});

export const updateRequest = asyncHandler(async (req, res) => {
  const input = requestUpdateSchema.parse(req.body);

  const existing = await prisma.maintenanceRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Request not found.');

  // Recompute the priority score whenever any scoring input changes.
  const merged = { ...existing, ...input };
  const priorityScore = computePriorityScore({
    urgency: merged.urgency,
    impact: merged.impact,
    assetImportance: merged.assetImportance,
    estimatedCost: merged.estimatedCost,
    category: merged.category,
  });

  const request = await prisma.maintenanceRequest.update({
    where: { id: req.params.id },
    data: { ...input, priorityScore },
    include: requestInclude,
  });
  ok(res, request);
});

export const deleteRequest = asyncHandler(async (req, res) => {
  await prisma.maintenanceRequest.delete({ where: { id: req.params.id } });
  ok(res, { deleted: true });
});

// POST /api/requests/:id/reject  (admin only) — "Approve Maintenance Request"'s
// counterpart: turns down a request with a reason the manager can see and print.
export const rejectRequest = asyncHandler(async (req, res) => {
  const { reason } = rejectSchema.parse(req.body);

  const existing = await prisma.maintenanceRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Request not found.');
  if (existing.status === 'REJECTED') throw new ApiError(400, 'This request has already been rejected.');

  const request = await prisma.maintenanceRequest.update({
    where: { id: req.params.id },
    data: {
      status: 'REJECTED',
      rejectionReason: reason ?? null,
      reviewedById: req.user.id,
      reviewedAt: new Date(),
    },
    include: requestInclude,
  });
  ok(res, request);
});

// Returns the active requests ranked by the DSS, optionally for one property.
export const rankedRequests = asyncHandler(async (req, res) => {
  const { propertyId } = req.query;
  const where = { status: { in: ['PENDING', 'APPROVED'] } };

  const scope = await scopeForUser(req.user);
  if (scope) {
    where.propertyId = propertyId && scope.includes(propertyId) ? propertyId : { in: scope };
  } else if (propertyId) {
    where.propertyId = propertyId;
  }

  const requests = await prisma.maintenanceRequest.findMany({ where, include: requestInclude });
  const ranked = rankRequests(requests).map((r, i) => ({ ...r, rank: i + 1 }));
  ok(res, { model: getModelConfig(), ranked });
});
