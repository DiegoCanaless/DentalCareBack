import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

router.get('/', authenticate, requireRole('SUPERADMIN'), async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [users, appointments] = await Promise.all([
      prisma.user.findMany(),
      prisma.appointment.findMany({
        where: { date: { gte: startOfMonth.toISOString() } },
        include: { treatment: true }
      })
    ]);

    const monthlyRevenue = appointments
      .filter(a => a.status === 'COMPLETED')
      .reduce((sum, a) => sum + a.treatment.price, 0);

    const stats = {
      totalUsers: users.length,
      totalDentists: users.filter(u => u.role === 'DENTIST').length,
      totalPatients: users.filter(u => u.role === 'USER').length,
      pendingAppointments: appointments.filter(a => a.status === 'PENDING').length,
      confirmedAppointments: appointments.filter(a => a.status === 'CONFIRMED').length,
      completedAppointments: appointments.filter(a => a.status === 'COMPLETED').length,
      monthlyRevenue,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

export default router;