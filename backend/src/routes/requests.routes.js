import { Router } from 'express';
import {
  listRequests, getRequest, createRequest, updateRequest, deleteRequest, rankedRequests, rejectRequest,
} from '../controllers/requests.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', listRequests);
router.get('/ranked', rankedRequests); // must precede /:id
router.get('/:id', getRequest);
// Both roles can log a request — a manager can only log one for their own
// assigned property (enforced in the controller); an admin is unrestricted.
router.post('/', requireRole('ADMIN', 'MANAGER'), createRequest);
router.put('/:id', requireRole('ADMIN'), updateRequest);
router.post('/:id/reject', requireRole('ADMIN'), rejectRequest);
router.delete('/:id', requireRole('ADMIN'), deleteRequest);

export default router;
