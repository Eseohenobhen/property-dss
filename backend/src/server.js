import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`\n  Property DSS API running on http://localhost:${env.port}`);
  console.log(`  Health check:  http://localhost:${env.port}/health\n`);
});

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
