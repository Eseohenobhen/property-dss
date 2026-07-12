import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../middleware/error.js';
import { ok } from '../utils/serialize.js';
import { fundSchema, fundUpdateSchema } from '../utils/validation.js';
import { getManagedPropertyIds } from '../services/access.js';

const fundInclude = { property: { select: { id: true, name: true } } };

export const listFunds = asyncHandler(async (req, res) => {
  const where = {};
  if (req.user.role === 'MANAGER') {
    const ids = await getManagedPropertyIds(req.user.id);
    where.propertyId = { in: ids };
  }
  const funds = await prisma.maintenanceFund.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: fundInclude,
  });
  ok(res, funds);
});

export const getFund = asyncHandler(async (req, res) => {
  const fund = await prisma.maintenanceFund.findUnique({
    where: { id: req.params.id },
    include: {
      ...fundInclude,
      allocations: {
        orderBy: { allocationDate: 'desc' },
        include: {
          request: { select: { title: true } },
          allocatedBy: { select: { fullName: true } },
          adjustments: { orderBy: { createdAt: 'desc' }, include: { adjustedBy: { select: { fullName: true } } } },
        },
      },
    },
  });
  if (!fund) throw new ApiError(404, 'Fund not found.');

  if (req.user.role === 'MANAGER') {
    const ids = await getManagedPropertyIds(req.user.id);
    if (!ids.includes(fund.propertyId)) throw new ApiError(403, 'You are not assigned to this property.');
  }
  ok(res, fund);
});

export const createFund = asyncHandler(async (req, res) => {
  const input = fundSchema.parse(req.body);
  const fund = await prisma.maintenanceFund.create({
    data: { ...input, allocatedAmount: 0 },
    include: fundInclude,
  });
  ok(res, fund, 201);
});

export const updateFund = asyncHandler(async (req, res) => {
  const input = fundUpdateSchema.parse(req.body);
  // Never let allocatedAmount be edited directly — it is driven by allocations.
  const { totalAmount, periodLabel, propertyId } = input;
  const fund = await prisma.maintenanceFund.update({
    where: { id: req.params.id },
    data: { totalAmount, periodLabel, propertyId },
    include: fundInclude,
  });
  ok(res, fund);
});

export const deleteFund = asyncHandler(async (req, res) => {
  await prisma.maintenanceFund.delete({ where: { id: req.params.id } });
  ok(res, { deleted: true });
});
