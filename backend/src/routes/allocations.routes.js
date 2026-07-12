import { Router } from 'express';
import { listAllocations, createAllocation, adjustAllocation } from '../controllers/allocations.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', listAllocations);
router.post('/', requireRole('ADMIN'), createAllocation);
router.patch('/:id/adjust', requireRole('ADMIN'), adjustAllocation);

export default router;
