import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../middleware/error.js';
import { ok } from '../utils/serialize.js';
import { fundSchema, fundUpdateSchema } from '../utils/validation.js';

const fundInclude = { property: { select: { id: true, name: true } } };

export const listFunds = asyncHandler(async (req, res) => {
  const funds = await prisma.maintenanceFund.findMany({
    orderBy: { createdAt: 'desc' },
    include: fundInclude,
  });
  ok(res, funds);
});

export const getFund = asyncHandler(async (req, res) => {
  const fund = await prisma.maintenanceFund.findUnique({
    where: { id: req.params.id },
    include: { ...fundInclude, allocations: { include: { request: { select: { title: true } } } } },
  });
  if (!fund) throw new ApiError(404, 'Fund not found.');
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
