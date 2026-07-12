import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/error.js';
import { ok } from '../utils/serialize.js';

// GET /api/users?role=MANAGER  (admin only)
// Lists user accounts, optionally filtered by role — used by the admin UI to
// pick which manager to assign to a property.
export const listUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const where = {};
  if (role) where.role = role;

  const users = await prisma.user.findMany({
    where,
    orderBy: { fullName: 'asc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { managedProperties: true } },
    },
  });
  ok(res, users);
});
