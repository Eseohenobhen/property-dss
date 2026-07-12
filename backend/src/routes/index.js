import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import authRoutes from './auth.routes.js';
import propertyRoutes from './properties.routes.js';
import requestRoutes from './requests.routes.js';
import fundRoutes from './funds.routes.js';
import allocationRoutes from './allocations.routes.js';
import statsRoutes from './stats.routes.js';
import userRoutes from './users.routes.js';

const router = Router();

// Public auth routes (register / login)
router.use('/auth', authRoutes);

// Everything below requires a valid session token.
router.use(authenticate);
router.use('/properties', propertyRoutes);
router.use('/requests', requestRoutes);
router.use('/funds', fundRoutes);
router.use('/allocations', allocationRoutes);
router.use('/stats', statsRoutes);
router.use('/users', userRoutes);

export default router;
