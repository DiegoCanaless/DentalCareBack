import { PrismaClient } from '@prisma/client';
import { sendAppointmentConfirmedEmail } from '../lib/email.js';
import logger from '../lib/logger.js';
import { io } from '../index.js';

const prisma = new PrismaClient();

export const deleteAllAppointments = async (req, res) => {
  try {
    if (req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Solo el administrador puede eliminar todas las citas' });
    }
    await prisma.appointment.deleteMany({});
    res.json({ message: 'Todas las citas han sido eliminadas' });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const getAppointments = async (req, res) => {
  try {
    const { date, status } = req.query;
    const where = {};
    if (req.user.role === 'USER') {
      where.userId = req.user.id;
    }
    if (req.user.role === 'DENTIST') {
      where.OR = [
        { dentistId: req.user.id },
        { dentistId: null }
      ];
    }
    if (date) {
      const startOfDay = new Date(date + 'T00:00:00Z');
      const endOfDay = new Date(date + 'T23:59:59Z');
      where.date = { gte: startOfDay, lte: endOfDay };
    }
    if (status) {
      where.status = status;
    }
    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        treatment: true
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }]
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const { date, time, treatmentId, dentistId } = req.body;
    if (!date || !time || !treatmentId) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const treatment = await prisma.treatment.findUnique({ where: { id: treatmentId } });
    if (!treatment) {
      return res.status(404).json({ error: 'Tratamiento no encontrado' });
    }

    const dateObj = new Date(date + 'T00:00:00Z');
    const dayOfWeek = dateObj.getUTCDay();
    
    if (dayOfWeek === 0) {
      return res.status(400).json({ error: 'La clínica está cerrada los domingos' });
    }

    let startHour = 9;
    let endHour = 18;
    if (dayOfWeek === 6) {
      endHour = 14;
    }

    const [startH, startMin] = time.split(':').map(Number);
    const duration = treatment.duration;
    const endMinTotal = startMin + duration;
    const endHourTotal = startH + Math.floor(endMinTotal / 60);
    const actualEndMin = endMinTotal % 60;
    const endTimeStr = `${endHourTotal.toString().padStart(2, '0')}:${actualEndMin.toString().padStart(2, '0')}`;

    if (startH < startHour || endHourTotal > endHour || (endHourTotal === endHour && actualEndMin > 0)) {
      return res.status(400).json({ error: `Horario fuera del horario de atención (${startHour}:00 - ${endHour}:00)` });
    }

    const whereCondition = {
      date: { gte: new Date(date + 'T00:00:00Z'), lt: new Date(date + 'T23:59:59Z') },
      status: { in: ['PENDING', 'CONFIRMED'] },
    };

    if (dentistId) {
      whereCondition.dentistId = parseInt(dentistId);
    } else {
      whereCondition.dentistId = null;
    }

    const existingAppointments = await prisma.appointment.findMany({ where: whereCondition });

    for (const apt of existingAppointments) {
      const [aptStartH, aptStartM] = apt.time.split(':').map(Number);
      const aptTreatment = await prisma.treatment.findUnique({ where: { id: apt.treatmentId } });
      const aptEndM = aptStartM + (aptTreatment?.duration || 30);
      const aptEndH = aptStartH + Math.floor(aptEndM / 60);
      const aptEndMin = aptEndM % 60;
      const aptEndTime = `${aptEndH.toString().padStart(2, '0')}:${aptEndMin.toString().padStart(2, '0')}`;

      if ((time >= apt.time && time < aptEndTime) || (endTimeStr > apt.time && endTimeStr <= aptEndTime) || (time <= apt.time && endTimeStr >= aptEndTime)) {
        return res.status(400).json({ error: 'Este horario se superpone con otra cita' });
      }
    }

    const appointmentData = {
      date: new Date(date),
      time,
      treatmentId,
      userId: req.user.id,
    };

    if (dentistId) {
      appointmentData.dentistId = parseInt(dentistId);
    }

    const appointment = await prisma.appointment.create({
      data: appointmentData,
      include: {
        user: { select: { id: true, name: true, email: true } },
        treatment: true,
      }
    });

    const dentist = appointment.dentistId 
      ? await prisma.user.findUnique({ 
          where: { id: appointment.dentistId }, 
          select: { id: true, name: true } 
        }) 
      : null;

    io.emit('appointment:created', { ...appointment, dentist });
    
    res.json(appointment);
  } catch (error) {
    logger.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    
    const existingAppointment = await prisma.appointment.findUnique({ where: { id: parseInt(id) } });
    if (!existingAppointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    if (req.user.role === 'DENTIST') {
      if (existingAppointment.dentistId !== null && existingAppointment.dentistId !== req.user.id) {
        return res.status(403).json({ error: 'No tienes permisos para modificar esta cita' });
      }
    }
    
    const updateData = { status };
    if (req.user.role === 'DENTIST' && existingAppointment.dentistId === null) {
      updateData.dentistId = req.user.id;
    }
    
    const appointment = await prisma.appointment.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
        treatment: true
      }
    });

    if (status === 'CONFIRMED') {
      sendAppointmentConfirmedEmail(
        appointment.user.email,
        appointment.user.name,
        appointment
      ).catch(err => logger.error('Confirmation email error:', err));
    }

    io.emit('appointment:updated', appointment);

    res.json(appointment);
  } catch (error) {
    logger.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await prisma.appointment.findUnique({ where: { id: parseInt(id) } });
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    if (req.user.role !== 'DENTIST' && appointment.userId !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para cancelar esta cita' });
    }
    await prisma.appointment.update({
      where: { id: parseInt(id) },
      data: { status: 'CANCELLED' }
    });
    
    io.emit('appointment:cancelled', { id: parseInt(id) });
    
    res.json({ message: 'Cita cancelada' });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const getAvailability = async (req, res) => {
  try {
    const { treatmentId, date } = req.params;
    const treatment = await prisma.treatment.findUnique({ where: { id: parseInt(treatmentId) } });
    if (!treatment) {
      return res.status(404).json({ error: 'Tratamiento no encontrado' });
    }

    const dateObj = new Date(date + 'T00:00:00Z');
    const dayOfWeek = dateObj.getUTCDay();

    if (dayOfWeek === 0) {
      return res.json({});
    }

    let startHour = 9;
    let endHour = 18;
    if (dayOfWeek === 6) {
      endHour = 14;
    }

    const dentists = await prisma.user.findMany({
      where: { role: 'DENTIST' },
      include: {
        treatments: {
          where: { treatmentId: parseInt(treatmentId) }
        }
      }
    });

    const availableDentists = dentists.filter(d => d.treatments.length > 0);

    const result = {};

    for (const dentist of availableDentists) {
      const appointments = await prisma.appointment.findMany({
        where: {
          date: { gte: new Date(date + 'T00:00:00Z'), lt: new Date(date + 'T23:59:59Z') },
          status: { in: ['PENDING', 'CONFIRMED'] },
          dentistId: dentist.id
        },
        select: { time: true, treatmentId: true }
      });

      const bookedTimes = new Set();
      for (const apt of appointments) {
        const [startH, startM] = apt.time.split(':').map(Number);
        const t = await prisma.treatment.findUnique({ where: { id: apt.treatmentId } });
        const dur = t?.duration || 30;
        const endM = startM + dur;
        const endH = startH + Math.floor(endM / 60);
        const endMin = endM % 60;

        for (let h = startH; h < endH || (h === endH && endMin > 0); h++) {
          for (let m = (h === startH ? startM : 0); m < (h === endH ? endMin : 60); m += 30) {
            bookedTimes.add(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
          }
        }
      }

      const allSlots = [];
      for (let hour = startHour; hour < endHour; hour++) {
        for (let min = 0; min < 60; min += 30) {
          const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          const endTime = min + treatment.duration;
          const endHourCalc = hour + Math.floor(endTime / 60);
          const endMinCalc = endTime % 60;
          if (endHourCalc > endHour || (endHourCalc === endHour && endMinCalc > 0)) continue;
          allSlots.push(time);
        }
      }

      const available = allSlots.filter(slot => !bookedTimes.has(slot));
      if (available.length > 0) {
        result[dentist.id] = {
          dentist: { id: dentist.id, name: dentist.name },
          slots: available
        };
      }
    }

    res.json(result);
  } catch (error) {
    logger.error('Error getting availability:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};
