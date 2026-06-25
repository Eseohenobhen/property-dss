import { Router } from 'express';
import { dashboardStats, reportStats } from '../controllers/stats.controller.js';

const router = Router();

router.get('/dashboard', dashboardStats);
router.get('/reports', reportStats);

export default router;
