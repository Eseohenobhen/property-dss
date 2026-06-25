import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../middleware/error.js';
import { ok } from '../utils/serialize.js';
import { requestSchema, requestUpdateSchema } from '../utils/validation.js';
import { computePriorityScore, rankRequests, getModelConfig } from '../services/dss.js';

const requestInclude = {
  property: { select: { id: true, name: true } },
  requestedBy: { select: { fullName: true } },
};

export const listRequests = asyncHandler(async (req, res) => {
  const { propertyId, status, category, search } = req.query;
  const where = {};
  if (propertyId) where.propertyId = propertyId;
  if (status) where.status = status;
  if (category) where.category = category;
  if (search) where.title = { contains: search, mode: 'insensitive' };

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
    include: { ...requestInclude, allocations: true },
  });
  if (!request) throw new ApiError(404, 'Request not found.');
  ok(res, request);
});

export const createRequest = asyncHandler(async (req, res) => {
  const input = requestSchema.parse(req.body);

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

// Returns the active requests ranked by the DSS, optionally for one property.
export const rankedRequests = asyncHandler(async (req, res) => {
  const { propertyId } = req.query;
  const where = { status: { in: ['PENDING', 'APPROVED'] } };
  if (propertyId) where.propertyId = propertyId;

  const requests = await prisma.maintenanceRequest.findMany({ where, include: requestInclude });
  const ranked = rankRequests(requests).map((r, i) => ({ ...r, rank: i + 1 }));
  ok(res, { model: getModelConfig(), ranked });
});
