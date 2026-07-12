import { prisma } from '../lib/prisma.js';

// Returns the list of property IDs a manager is currently assigned to.
// Admins are never restricted by this — callers should only invoke it
// when req.user.role === 'MANAGER'.
export async function getManagedPropertyIds(userId) {
  const assignments = await prisma.propertyAssignment.findMany({
    where: { managerId: userId },
    select: { propertyId: true },
  });
  return assignments.map((a) => a.propertyId);
}

// Convenience: true if `propertyId` is in the manager's assigned set.
export async function managerCanAccessProperty(userId, propertyId) {
  const count = await prisma.propertyAssignment.count({
    where: { managerId: userId, propertyId },
  });
  return count > 0;
}
