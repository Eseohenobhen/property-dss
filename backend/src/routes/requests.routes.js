import { Router } from 'express';
import {
  listRequests, getRequest, createRequest, updateRequest, deleteRequest, rankedRequests,
} from '../controllers/requests.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', listRequests);
router.get('/ranked', rankedRequests); // must precede /:id
router.get('/:id', getRequest);
router.post('/', requireRole('ADMIN'), createRequest);
router.put('/:id', requireRole('ADMIN'), updateRequest);
router.delete('/:id', requireRole('ADMIN'), deleteRequest);

export default router;
