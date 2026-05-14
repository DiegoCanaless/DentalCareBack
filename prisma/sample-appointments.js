import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addSampleAppointments() {
  const dentist = await prisma.user.findFirst({
    where: { role: 'DENTIST', email: 'dr.garcia@dentalcare.com' }
  });

  if (!dentist) {
    console.log('Dentist not found');
    return;
  }

  let patient = await prisma.user.findFirst({
    where: { role: 'USER', email: 'paciente@test.com' }
  });

  if (!patient) {
    const bcrypt = await import('bcryptjs');
    const password = await bcrypt.default.hash('test123', 10);
    patient = await prisma.user.create({
      data: {
        name: 'Juan Pérez',
        email: 'paciente@test.com',
        password: password,
        role: 'USER'
      }
    });
    console.log('Created patient:', patient.name);
  }

  const treatments = await prisma.treatment.findMany();

  const sampleAppointments = [
    { daysAgo: 30, treatmentIndex: 0, time: '10:00', status: 'COMPLETED' },
    { daysAgo: 25, treatmentIndex: 2, time: '11:00', status: 'COMPLETED' },
    { daysAgo: 20, treatmentIndex: 1, time: '14:00', status: 'COMPLETED' },
    { daysAgo: 15, treatmentIndex: 0, time: '09:30', status: 'COMPLETED' },
    { daysAgo: 10, treatmentIndex: 3, time: '10:00', status: 'CANCELLED' },
    { daysAgo: 5, treatmentIndex: 4, time: '15:00', status: 'COMPLETED' },
  ];

  for (const apt of sampleAppointments) {
    const date = new Date();
    date.setDate(date.getDate() - apt.daysAgo);

    const existing = await prisma.appointment.findFirst({
      where: {
        date: {
          gte: new Date(date.setHours(0,0,0,0)),
          lt: new Date(date.setHours(23,59,59,999))
        },
        time: apt.time,
        dentistId: dentist.id
      }
    });

    if (!existing) {
      await prisma.appointment.create({
        data: {
          date: new Date(Date.now() - apt.daysAgo * 24 * 60 * 60 * 1000),
          time: apt.time,
          status: apt.status,
          userId: patient.id,
          treatmentId: treatments[apt.treatmentIndex].id,
          dentistId: dentist.id
        }
      });
      console.log(`Created appointment: ${apt.status} - ${apt.daysAgo} days ago`);
    }
  }

  console.log('Sample appointments created!');
}

addSampleAppointments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());