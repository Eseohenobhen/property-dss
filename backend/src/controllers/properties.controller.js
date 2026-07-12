import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../middleware/error.js';
import { ok } from '../utils/serialize.js';
import { propertySchema, propertyUpdateSchema, assignManagerSchema } from '../utils/validation.js';
import { getManagedPropertyIds } from '../services/access.js';

const assignmentInclude = {
  assignments: {
    include: { manager: { select: { id: true, fullName: true, email: true } } },
  },
};

export const listProperties = asyncHandler(async (req, res) => {
  const where = {};
  if (req.user.role === 'MANAGER') {
    const ids = await getManagedPropertyIds(req.user.id);
    where.id = { in: ids };
  }

  const properties = await prisma.property.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { requests: true, funds: true } },
      createdBy: { select: { fullName: true } },
      ...assignmentInclude,
    },
  });
  ok(res, properties);
});

export const getProperty = asyncHandler(async (req, res) => {
  if (req.user.role === 'MANAGER') {
    const ids = await getManagedPropertyIds(req.user.id);
    if (!ids.includes(req.params.id)) {
      throw new ApiError(403, 'You are not assigned to this property.');
    }
  }

  const property = await prisma.property.findUnique({
    where: { id: req.params.id },
    include: {
      requests: { orderBy: { priorityScore: 'desc' } },
      funds: {
        orderBy: { createdAt: 'desc' },
        include: {
          allocations: {
            orderBy: { allocationDate: 'desc' },
            include: {
              request: { select: { id: true, title: true, category: true } },
              allocatedBy: { select: { fullName: true } },
              adjustments: { orderBy: { createdAt: 'desc' }, include: { adjustedBy: { select: { fullName: true } } } },
            },
          },
        },
      },
      createdBy: { select: { fullName: true } },
      ...assignmentInclude,
    },
  });
  if (!property) throw new ApiError(404, 'Property not found.');
  ok(res, property);
});

// GET /api/properties/:id/managers  (admin only)
export const listPropertyManagers = asyncHandler(async (req, res) => {
  const property = await prisma.property.findUnique({ where: { id: req.params.id } });
  if (!property) throw new ApiError(404, 'Property not found.');

  const assignments = await prisma.propertyAssignment.findMany({
    where: { propertyId: req.params.id },
    include: { manager: { select: { id: true, fullName: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
  ok(res, assignments);
});

// POST /api/properties/:id/managers  { managerId }  (admin only)
export const assignManager = asyncHandler(async (req, res) => {
  const { managerId } = assignManagerSchema.parse(req.body);

  const [property, manager] = await Promise.all([
    prisma.property.findUnique({ where: { id: req.params.id } }),
    prisma.user.findUnique({ where: { id: managerId } }),
  ]);
  if (!property) throw new ApiError(404, 'Property not found.');
  if (!manager) throw new ApiError(404, 'User not found.');
  if (manager.role !== 'MANAGER') throw new ApiError(400, 'Only manager accounts can be assigned to a property.');

  const existing = await prisma.propertyAssignment.findUnique({
    where: { propertyId_managerId: { propertyId: req.params.id, managerId } },
  });
  if (existing) throw new ApiError(409, 'This manager is already assigned to this property.');

  const assignment = await prisma.propertyAssignment.create({
    data: { propertyId: req.params.id, managerId, assignedById: req.user.id },
    include: { manager: { select: { id: true, fullName: true, email: true } } },
  });
  ok(res, assignment, 201);
});

// DELETE /api/properties/:id/managers/:managerId  (admin only)
export const unassignManager = asyncHandler(async (req, res) => {
  const { id, managerId } = req.params;
  const existing = await prisma.propertyAssignment.findUnique({
    where: { propertyId_managerId: { propertyId: id, managerId } },
  });
  if (!existing) throw new ApiError(404, 'This manager is not assigned to this property.');

  await prisma.propertyAssignment.delete({ where: { id: existing.id } });
  ok(res, { deleted: true });
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
