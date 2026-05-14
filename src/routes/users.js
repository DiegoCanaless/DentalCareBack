import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { validate } from '../middleware/validation.js';
import { createUserSchema, updateUserSchema, dentistTreatmentsSchema } from '../middleware/validation.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, requireRole('SUPERADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.get('/dentists', authenticate, requireRole('SUPERADMIN'), async (req, res) => {
  try {
    const dentists = await prisma.user.findMany({
      where: { role: 'DENTIST' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: 'asc' }
    });
    res.json(dentists);
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.post('/', authenticate, requireRole('SUPERADMIN'), validate(createUserSchema), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    res.json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.delete('/:id', authenticate, requireRole('SUPERADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (user.role === 'SUPERADMIN') {
      return res.status(403).json({ error: 'No puedes eliminar a otro superadmin' });
    }
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.put('/:id', authenticate, requireRole('SUPERADMIN'), validate(updateUserSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (user.role === 'SUPERADMIN') {
      return res.status(403).json({ error: 'No puedes modificar a otro superadmin' });
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    
    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.get('/me/treatments', authenticate, requireRole('DENTIST'), async (req, res) => {
  try {
    const treatments = await prisma.userTreatment.findMany({
      where: { userId: req.user.id },
      include: { treatment: true }
    });
    res.json(treatments.map(t => t.treatment));
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.put('/me/treatments', authenticate, requireRole('DENTIST'), validate(dentistTreatmentsSchema), async (req, res) => {
  try {
    const { treatmentIds } = req.body;
    
    await prisma.userTreatment.deleteMany({
      where: { userId: req.user.id }
    });
    
    if (treatmentIds.length > 0) {
      await prisma.userTreatment.createMany({
        data: treatmentIds.map(treatmentId => ({
          userId: req.user.id,
          treatmentId
        }))
      });
    }
    
    const treatments = await prisma.userTreatment.findMany({
      where: { userId: req.user.id },
      include: { treatment: true }
    });
    res.json(treatments.map(t => t.treatment));
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.get('/dentists-by-treatment/:treatmentId', authenticate, async (req, res) => {
  try {
    const { treatmentId } = req.params;
    const dentists = await prisma.user.findMany({
      where: { role: 'DENTIST' },
      include: {
        treatments: {
          where: { treatmentId: parseInt(treatmentId) },
          include: { treatment: true }
        }
      }
    });
    const filteredDentists = dentists.filter(d => d.treatments.length > 0);
    res.json(filteredDentists.map(d => ({ id: d.id, name: d.name, email: d.email })));
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

export default router;
