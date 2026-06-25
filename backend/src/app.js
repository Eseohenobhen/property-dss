import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  if (!env.isProd) app.use(morgan('dev'));

  // Health check
  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'property-dss-api' }));

  // All API endpoints live under /api
  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
