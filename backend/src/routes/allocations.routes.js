import { Router } from 'express';
import { listAllocations, createAllocation } from '../controllers/allocations.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', listAllocations);
router.post('/', requireRole('ADMIN'), createAllocation);

export default router;
