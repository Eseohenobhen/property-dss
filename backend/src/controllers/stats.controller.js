import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/error.js';
import { ok } from '../utils/serialize.js';
import { rankRequests } from '../services/dss.js';

// GET /api/stats/dashboard
export const dashboardStats = asyncHandler(async (req, res) => {
  const [
    totalProperties,
    activeProperties,
    totalRequests,
    pendingRequests,
    funds,
    activeRequests,
    categoryGroups,
    recentAllocations,
  ] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { status: 'ACTIVE' } }),
    prisma.maintenanceRequest.count(),
    prisma.maintenanceRequest.count({ where: { status: 'PENDING' } }),
    prisma.maintenanceFund.findMany({ select: { totalAmount: true, allocatedAmount: true } }),
    prisma.maintenanceRequest.findMany({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
      include: { property: { select: { name: true } } },
    }),
    prisma.maintenanceRequest.groupBy({ by: ['category'], _count: { _all: true } }),
    prisma.fundAllocation.findMany({
      orderBy: { allocationDate: 'desc' },
      take: 5,
      include: {
        request: { select: { title: true } },
        fund: { select: { periodLabel: true, property: { select: { name: true } } } },
      },
    }),
  ]);

  const totalFunds = funds.reduce((s, f) => s + Number(f.totalAmount), 0);
  const allocatedFunds = funds.reduce((s, f) => s + Number(f.allocatedAmount), 0);

  const priorityQueue = rankRequests(activeRequests)
    .slice(0, 6)
    .map((r, i) => ({
      rank: i + 1,
      id: r.id,
      title: r.title,
      category: r.category,
      priorityScore: Number(r.priorityScore),
      estimatedCost: Number(r.estimatedCost),
      property: r.property?.name,
    }));

  const categoryBreakdown = categoryGroups
    .map((g) => ({ category: g.category, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  ok(res, {
    counts: { totalProperties, activeProperties, totalRequests, pendingRequests },
    funds: {
      total: totalFunds,
      allocated: allocatedFunds,
      available: totalFunds - allocatedFunds,
      utilisation: totalFunds > 0 ? Math.round((allocatedFunds / totalFunds) * 100) : 0,
    },
    priorityQueue,
    categoryBreakdown,
    recentAllocations,
  });
});

// GET /api/stats/reports
export const reportStats = asyncHandler(async (req, res) => {
  const [categoryGroups, statusGroups, allocations, deferred, funds] = await Promise.all([
    prisma.maintenanceRequest.groupBy({
      by: ['category'],
      _count: { _all: true },
      _sum: { estimatedCost: true },
    }),
    prisma.maintenanceRequest.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.fundAllocation.findMany({
      orderBy: { allocationDate: 'desc' },
      include: {
        request: { select: { title: true, category: true } },
        fund: { select: { periodLabel: true, property: { select: { name: true } } } },
        allocatedBy: { select: { fullName: true } },
      },
    }),
    prisma.maintenanceRequest.findMany({
      where: { status: 'DEFERRED' },
      include: { property: { select: { name: true } } },
      orderBy: { priorityScore: 'desc' },
    }),
    prisma.maintenanceFund.findMany({ include: { property: { select: { name: true } } } }),
  ]);

  const categoryBreakdown = categoryGroups
    .map((g) => ({
      category: g.category,
      count: g._count._all,
      totalCost: Number(g._sum.estimatedCost ?? 0),
    }))
    .sort((a, b) => b.count - a.count);

  const statusBreakdown = statusGroups.map((g) => ({ status: g.status, count: g._count._all }));

  const fundUtilisation = funds.map((f) => ({
    id: f.id,
    property: f.property?.name,
    periodLabel: f.periodLabel,
    total: Number(f.totalAmount),
    allocated: Number(f.allocatedAmount),
    available: Number(f.totalAmount) - Number(f.allocatedAmount),
  }));

  ok(res, { categoryBreakdown, statusBreakdown, allocationHistory: allocations, deferredRequests: deferred, fundUtilisation });
});
