import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../middleware/error.js';
import { ok } from '../utils/serialize.js';
import { allocationSchema } from '../utils/validation.js';
import { recommendAllocation } from '../services/dss.js';

// GET /api/funds/:id/recommendation
export const getRecommendation = asyncHandler(async (req, res) => {
  const fund = await prisma.maintenanceFund.findUnique({
    where: { id: req.params.id },
    include: { property: { select: { id: true, name: true } } },
  });
  if (!fund) throw new ApiError(404, 'Fund not found.');

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
      data: { status: 'APPROVED' },
    });
    return created;
  });

  ok(res, allocation, 201);
});

// GET /api/allocations — full audit trail for reports.
export const listAllocations = asyncHandler(async (req, res) => {
  const allocations = await prisma.fundAllocation.findMany({
    orderBy: { allocationDate: 'desc' },
    include: {
      request: { select: { title: true, category: true } },
      fund: { select: { periodLabel: true, property: { select: { name: true } } } },
      allocatedBy: { select: { fullName: true } },
    },
  });
  ok(res, allocations);
});
