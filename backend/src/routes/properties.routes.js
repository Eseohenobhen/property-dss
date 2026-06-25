import { Router } from 'express';
import {
  listProperties, getProperty, createProperty, updateProperty, deleteProperty,
} from '../controllers/properties.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', listProperties);
router.get('/:id', getProperty);
router.post('/', requireRole('ADMIN'), createProperty);
router.put('/:id', requireRole('ADMIN'), updateProperty);
router.delete('/:id', requireRole('ADMIN'), deleteProperty);

export default router;
