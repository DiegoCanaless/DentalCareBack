import { Router } from 'express';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment, getAvailability, deleteAllAppointments } from '../controllers/appointmentController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { createAppointmentSchema, updateAppointmentSchema } from '../middleware/validation.js';

const router = Router();

router.get('/', authenticate, getAppointments);
router.post('/', authenticate, validate(createAppointmentSchema), createAppointment);
router.put('/:id', authenticate, validate(updateAppointmentSchema), updateAppointment);
router.delete('/:id', authenticate, deleteAppointment);
router.delete('/all/clear', authenticate, requireRole('SUPERADMIN'), deleteAllAppointments);
router.get('/availability/:treatmentId/:date', getAvailability);

export default router;