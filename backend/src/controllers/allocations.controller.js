import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../middleware/error.js';
import { ok } from '../utils/serialize.js';
import { allocationSchema, adjustAllocationSchema } from '../utils/validation.js';
import { recommendAllocation } from '../services/dss.js';
import { getManagedPropertyIds } from '../services/access.js';

// GET /api/funds/:id/recommendation
export const getRecommendation = asyncHandler(async (req, res) => {
  const fund = await prisma.maintenanceFund.findUnique({
    where: { id: req.params.id },
    include: { property: { select: { id: true, name: true } } },
  });
  if (!fund) throw new ApiError(404, 'Fund not found.');

  if (req.user.role === 'MANAGER') {
    const ids = await getManagedPropertyIds(req.user.id);
    if (!ids.includes(fund.propertyId)) throw new ApiError(403, 'You are not assigned to this property.');
  }

  const available = Number(fund.totalAmount) - Number(fund.allocatedAmount);

  const requests = await prisma.maintenanceRequest.findMany({
    where: {
      propertyId: fund.propertyId,
      status: { in: ['PENDING', 'APPROVED'] },
      allocations: { none: {} }, // exclude requests that are already funded
    },
    include: { property: { select: { name: true } } },
  });

  const result = recommendAllocation(requests, available);

  ok(res, {
    fund: {
      id: fund.id,
      periodLabel: fund.periodLabel,
      property: fund.property,
      totalAmount: Number(fund.totalAmount),
      allocatedAmount: Number(fund.allocatedAmount),
      availableAmount: available,
    },
    ...result,
  });
});

// POST /api/allocations  (admin only)
export const createAllocation = asyncHandler(async (req, res) => {
  const input = allocationSchema.parse(req.body);

  const [fund, request] = await Promise.all([
    prisma.maintenanceFund.findUnique({ where: { id: input.fundId } }),
    prisma.maintenanceRequest.findUnique({ where: { id: input.requestId } }),
  ]);
  if (!fund) throw new ApiError(404, 'Fund not found.');
  if (!request) throw new ApiError(404, 'Request not found.');

  if (request.propertyId !== fund.propertyId) {
    throw new ApiError(400, 'Request and fund belong to different properties.');
  }

  const alreadyFunded = await prisma.fundAllocation.findFirst({ where: { requestId: input.requestId } });
  if (alreadyFunded) {
    throw new ApiError(409, 'This request has already been funded.');
  }

  const available = Number(fund.totalAmount) - Number(fund.allocatedAmount);
  if (input.amountAssigned > available) {
    throw new ApiError(400, `Insufficient funds. Available: ${available.toLocaleString()}.`);
  }

  const allocation = await prisma.$transaction(async (tx) => {
    const created = await tx.fundAllocation.create({
      data: {
        fundId: input.fundId,
        requestId: input.requestId,
        amountAssigned: input.amountAssigned,
        // What the DSS suggested (usually the request's own estimatedCost) —
        // kept for comparison if the amount is later adjusted.
        suggestedAmount: input.suggestedAmount ?? request.estimatedCost,
        allocatedById: req.user.id,
        notes: input.notes ?? null,
      },
    });
    await tx.maintenanceFund.update({
      where: { id: input.fundId },
      data: { allocatedAmount: { increment: input.amountAssigned } },
    });
    await tx.maintenanceRequest.update({
      where: { id: input.requestId },
      data: { status: 'APPROVED', reviewedById: req.user.id, reviewedAt: new Date() },
    });
    return created;
  });

  ok(res, allocation, 201);
});

// PATCH /api/allocations/:id/adjust  (admin only) — "Adjust Funds": top up (or
// reduce) an already-approved allocation once real-world cost turns out
// different from what the DSS originally suggested. Requires a reason.
export const adjustAllocation = asyncHandler(async (req, res) => {
  const { newAmount, reason } = adjustAllocationSchema.parse(req.body);

  const allocation = await prisma.fundAllocation.findUnique({
    where: { id: req.params.id },
    include: { fund: true },
  });
  if (!allocation) throw new ApiError(404, 'Allocation not found.');

  const previousAmount = Number(allocation.amountAssigned);
  const delta = newAmount - previousAmount;

  if (delta > 0) {
    const available = Number(allocation.fund.totalAmount) - Number(allocation.fund.allocatedAmount);
    if (delta > available) {
      throw new ApiError(
        400,
        `Insufficient funds remaining in this property's budget to release an extra ${delta.toLocaleString()}. ` +
        `Only ${available.toLocaleString()} is available — increase the fund total first.`,
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.fundAllocation.update({
      where: { id: req.params.id },
      data: { amountAssigned: newAmount },
    });
    await tx.maintenanceFund.update({
      where: { id: allocation.fundId },
      data: { allocatedAmount: { increment: delta } },
    });
    await tx.fundAdjustment.create({
      data: {
        allocationId: allocation.id,
        previousAmount,
        newAmount,
        reason,
        adjustedById: req.user.id,
      },
    });
    return result;
  });

  ok(res, updated);
});

// GET /api/allocations — full audit trail for reports (scoped for managers).
export const listAllocations = asyncHandler(async (req, res) => {
  const where = {};
  if (req.user.role === 'MANAGER') {
    const ids = await getManagedPropertyIds(req.user.id);
    where.fund = { propertyId: { in: ids } };
  }

  const allocations = await prisma.fundAllocation.findMany({
    where,
    orderBy: { allocationDate: 'desc' },
    include: {
      request: { select: { title: true, category: true } },
      fund: { select: { periodLabel: true, property: { select: { name: true } } } },
      allocatedBy: { select: { fullName: true } },
      adjustments: { orderBy: { createdAt: 'desc' }, include: { adjustedBy: { select: { fullName: true } } } },
    },
  });
  ok(res, allocations);
});
