import { Router } from 'express';
import { listUsers } from '../controllers/users.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireRole('ADMIN'), listUsers);

export default router;
