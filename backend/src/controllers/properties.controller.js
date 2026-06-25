import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../middleware/error.js';
import { ok } from '../utils/serialize.js';
import { propertySchema, propertyUpdateSchema } from '../utils/validation.js';

export const listProperties = asyncHandler(async (req, res) => {
  const properties = await prisma.property.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { requests: true, funds: true } },
      createdBy: { select: { fullName: true } },
    },
  });
  ok(res, properties);
});

export const getProperty = asyncHandler(async (req, res) => {
  const property = await prisma.property.findUnique({
    where: { id: req.params.id },
    include: {
      requests: { orderBy: { priorityScore: 'desc' } },
      funds: { orderBy: { createdAt: 'desc' } },
      createdBy: { select: { fullName: true } },
    },
  });
  if (!property) throw new ApiError(404, 'Property not found.');
  ok(res, property);
});

export const createProperty = asyncHandler(async (req, res) => {
  const input = propertySchema.parse(req.body);
  const property = await prisma.property.create({
    data: { ...input, createdById: req.user.id },
  });
  ok(res, property, 201);
});

export const updateProperty = asyncHandler(async (req, res) => {
  const input = propertyUpdateSchema.parse(req.body);
  const property = await prisma.property.update({
    where: { id: req.params.id },
    data: input,
  });
  ok(res, property);
});

export const deleteProperty = asyncHandler(async (req, res) => {
  await prisma.property.delete({ where: { id: req.params.id } });
  ok(res, { deleted: true });
});
