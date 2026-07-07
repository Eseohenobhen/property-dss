import { PrismaClient } from '@prisma/client';

// Create a single shared Prisma client instance across lambda invocations
// to avoid exhausting database connections in serverless environments.
let prisma;
if (global.prisma) {
  prisma = global.prisma;
} else {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });
  // Cache the client on the global object (Node preserves globals across
  // invocations in the same runtime) — safe for serverless platforms.
  global.prisma = prisma;
}

export { prisma };
