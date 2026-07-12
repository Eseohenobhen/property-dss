import { Router } from 'express';
import {
  listProperties, getProperty, createProperty, updateProperty, deleteProperty,
  listPropertyManagers, assignManager, unassignManager,
} from '../controllers/properties.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', listProperties);
router.get('/:id', getProperty);
router.post('/', requireRole('ADMIN'), createProperty);
router.put('/:id', requireRole('ADMIN'), updateProperty);
router.delete('/:id', requireRole('ADMIN'), deleteProperty);

// Manager assignment ("Assign managers to a property")
router.get('/:id/managers', requireRole('ADMIN'), listPropertyManagers);
router.post('/:id/managers', requireRole('ADMIN'), assignManager);
router.delete('/:id/managers/:managerId', requireRole('ADMIN'), unassignManager);

export default router;
