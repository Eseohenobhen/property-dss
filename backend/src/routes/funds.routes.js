import { Router } from 'express';
import {
  listFunds, getFund, createFund, updateFund, deleteFund,
} from '../controllers/funds.controller.js';
import { getRecommendation } from '../controllers/allocations.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', listFunds);
router.get('/:id', getFund);
router.get('/:id/recommendation', getRecommendation); // DSS recommendation
router.post('/', requireRole('ADMIN'), createFund);
router.put('/:id', requireRole('ADMIN'), updateFund);
router.delete('/:id', requireRole('ADMIN'), deleteFund);

export default router;
