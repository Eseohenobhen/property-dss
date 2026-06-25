import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { computePriorityScore } from '../src/services/dss.js';

const prisma = new PrismaClient();

// Credentials come from the environment 
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'change-me-admin';
const MANAGER_EMAIL = process.env.SEED_MANAGER_EMAIL || 'manager@example.com';
const MANAGER_PASSWORD = process.env.SEED_MANAGER_PASSWORD || 'change-me-manager';

async function main() {
  console.log('Seeding database…');

  // Clear existing data (safe for a demo DB)
  await prisma.fundAllocation.deleteMany();
  await prisma.maintenanceFund.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  //  Users
  const adminPw = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const managerPw = await bcrypt.hash(MANAGER_PASSWORD, 10);

  const admin = await prisma.user.create({
    data: { fullName: 'System Admin', email: ADMIN_EMAIL, passwordHash: adminPw, role: 'ADMIN' },
  });
  await prisma.user.create({
    data: { fullName: 'Demo Manager', email: MANAGER_EMAIL, passwordHash: managerPw, role: 'MANAGER' },
  });

  // Properties
  const sunrise = await prisma.property.create({
    data: {
      name: 'Sunrise Estate Block A',
      address: '12 Jakande Close, Benin City, Edo State',
      propertyType: 'RESIDENTIAL',
      units: 24,
      yearBuilt: 2015,
      totalAreaSqm: 1200,
      description: 'Multi-unit residential block with shared facilities.',
      status: 'ACTIVE',
      createdById: admin.id,
    },
  });
  const lekki = await prisma.property.create({
    data: {
      name: 'Lekki Court Apartments',
      address: '7 Admiralty Way, Lekki Phase 1, Lagos',
      propertyType: 'APARTMENT',
      units: 16,
      yearBuilt: 2019,
      totalAreaSqm: 900,
      description: 'Serviced apartment complex with rooftop amenities.',
      status: 'ACTIVE',
      createdById: admin.id,
    },
  });
  const plaza = await prisma.property.create({
    data: {
      name: 'Wuse Market Plaza',
      address: 'Zone 3, Wuse, Abuja (FCT)',
      propertyType: 'COMMERCIAL',
      units: 40,
      yearBuilt: 2010,
      totalAreaSqm: 3500,
      description: 'Two-storey commercial plaza with retail units.',
      status: 'ACTIVE',
      createdById: admin.id,
    },
  });

  // Maintenance requests
  const requestSeeds = [
    { property: sunrise, title: 'Leaking roof over Flat 3B', category: 'ROOFING', urgency: 9, impact: 8, assetImportance: 9, estimatedCost: 450000, status: 'PENDING', description: 'Water ingress damaging ceiling during rains.' },
    { property: sunrise, title: 'Cracked load-bearing wall, stairwell', category: 'STRUCTURAL', urgency: 8, impact: 9, assetImportance: 10, estimatedCost: 1200000, status: 'PENDING', description: 'Visible diagonal crack; needs engineer assessment.' },
    { property: sunrise, title: 'Repaint common corridor', category: 'PAINTING', urgency: 2, impact: 2, assetImportance: 3, estimatedCost: 180000, status: 'PENDING', description: 'Cosmetic — scuffed walls.' },
    { property: lekki, title: 'Faulty main distribution board', category: 'ELECTRICAL', urgency: 9, impact: 8, assetImportance: 8, estimatedCost: 600000, status: 'PENDING', description: 'Intermittent power trips affecting 6 units.' },
    { property: lekki, title: 'Blocked sewage line, ground floor', category: 'PLUMBING', urgency: 7, impact: 7, assetImportance: 6, estimatedCost: 320000, status: 'PENDING', description: 'Backflow risk; health hazard.' },
    { property: lekki, title: 'Replace worn lobby flooring', category: 'FLOORING', urgency: 3, impact: 3, assetImportance: 4, estimatedCost: 500000, status: 'PENDING', description: 'Tiles lifting at entrance.' },
    { property: plaza, title: 'CCTV + access control upgrade', category: 'SECURITY', urgency: 6, impact: 7, assetImportance: 7, estimatedCost: 850000, status: 'PENDING', description: 'Cover blind spots in rear car park.' },
    { property: plaza, title: 'Rooftop AC chiller failure', category: 'HVAC', urgency: 7, impact: 6, assetImportance: 7, estimatedCost: 950000, status: 'PENDING', description: 'Cooling lost on first floor retail units.' },
    { property: plaza, title: 'Garden / landscaping refresh', category: 'LANDSCAPING', urgency: 2, impact: 2, assetImportance: 2, estimatedCost: 220000, status: 'PENDING', description: 'Frontage tidy-up.' },
  ];

  for (const r of requestSeeds) {
    const priorityScore = computePriorityScore({
      urgency: r.urgency, impact: r.impact, assetImportance: r.assetImportance,
      estimatedCost: r.estimatedCost, category: r.category,
    });
    await prisma.maintenanceRequest.create({
      data: {
        propertyId: r.property.id,
        title: r.title,
        description: r.description,
        category: r.category,
        urgency: r.urgency,
        impact: r.impact,
        assetImportance: r.assetImportance,
        estimatedCost: r.estimatedCost,
        status: r.status,
        priorityScore,
        requestedById: admin.id,
      },
    });
  }

  // Funds
  await prisma.maintenanceFund.create({
    data: { propertyId: sunrise.id, totalAmount: 1500000, allocatedAmount: 0, periodLabel: 'Q1 2026' },
  });
  await prisma.maintenanceFund.create({
    data: { propertyId: lekki.id, totalAmount: 1000000, allocatedAmount: 0, periodLabel: 'Q1 2026' },
  });
  await prisma.maintenanceFund.create({
    data: { propertyId: plaza.id, totalAmount: 2000000, allocatedAmount: 0, periodLabel: 'Q1 2026' },
  });

  console.log('Seed complete.');
  console.log(`  Admin   ${ADMIN_EMAIL}`);
  console.log(`  Manager  ${MANAGER_EMAIL}`);
  console.log('  (Passwords are whatever you set via SEED_* env vars — change them after first login.)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
