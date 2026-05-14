import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es muy largo'),
  email: z.string().email('Email inválido').max(255, 'Email muy largo'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(100, 'Contraseña muy larga'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const createUserSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['USER', 'DENTIST'], 'Rol inválido'),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['USER', 'DENTIST']).optional(),
}).refine(data => data.name || data.role, {
  message: 'Debes proporcionar al menos un campo para actualizar',
});

export const createTreatmentSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  description: z.string().max(500).optional(),
  duration: z.number().int().min(15, 'Duración mínima 15 minutos').max(240),
  price: z.number().int().min(0, 'El precio no puede ser negativo'),
  icon: z.string().max(50).optional(),
});

export const updateTreatmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  duration: z.number().int().min(15).max(240).optional(),
  price: z.number().int().min(0).optional(),
  icon: z.string().max(50).optional(),
  available: z.boolean().optional(),
});

export const createAppointmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (formato YYYY-MM-DD)'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida (formato HH:MM)'),
  treatmentId: z.number().int().positive('ID de tratamiento inválido'),
  dentistId: z.number().int().positive().optional(),
});

export const updateAppointmentSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'pending', 'confirmed', 'completed', 'cancelled']),
});

export const dentistTreatmentsSchema = z.object({
  treatmentIds: z.array(z.number().int().positive()),
});

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(400).json({ error: 'Datos inválidos' });
  }
};