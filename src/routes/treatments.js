import { Router } from 'express';
import { getTreatments, getTreatment, createTreatment, updateTreatment, deleteTreatment, getAllTreatments } from '../controllers/treatmentController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { createTreatmentSchema, updateTreatmentSchema } from '../middleware/validation.js';

const router = Router();

router.get('/', getTreatments);
router.get('/all', authenticate, requireRole('SUPERADMIN'), getAllTreatments);
router.get('/:id', getTreatment);
router.post('/', authenticate, requireRole('SUPERADMIN'), validate(createTreatmentSchema), createTreatment);
router.put('/:id', authenticate, requireRole('SUPERADMIN'), validate(updateTreatmentSchema), updateTreatment);
router.delete('/:id', authenticate, requireRole('SUPERADMIN'), deleteTreatment);

export default router;