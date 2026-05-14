import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const superadminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@dentalcare.com' },
    update: {},
    create: {
      name: 'Super Administrador',
      email: 'admin@dentalcare.com',
      password: superadminPassword,
      role: 'SUPERADMIN'
    }
  });

  const dentistPassword = await bcrypt.hash('dentist123', 10);
  await prisma.user.upsert({
    where: { email: 'dr.garcia@dentalcare.com' },
    update: {},
    create: {
      name: 'Dr. Roberto García',
      email: 'dr.garcia@dentalcare.com',
      password: dentistPassword,
      role: 'DENTIST'
    }
  });

  const treatments = [
    { name: 'Limpieza Dental', description: 'Limpieza profunda para eliminar placa y sarro, dejando tus dientes más limpios y saludables.', duration: 45, price: 50, icon: 'Sparkles' },
    { name: 'Blanqueamiento', description: 'Tratamiento profesional para aclarar el color de tus dientes varias tonalidades.', duration: 60, price: 200, icon: 'Star' },
    { name: 'Caries', description: 'Empaste o restauración dental para tratar caries y recuperar la salud de tu diente.', duration: 30, price: 80, icon: 'Shield' },
    { name: 'Ortodoncia', description: 'Evaluación y seguimiento de tratamiento ortodóncico con brackets o alineadores.', duration: 40, price: 100, icon: 'Clock' },
    { name: 'Extracción', description: 'Extracción de pieza dental cuando no es posible salvarla con otros tratamientos.', duration: 45, price: 120, icon: 'Calendar' },
    { name: 'Revisión General', description: 'Revisión completa de tu salud bucal con diagnóstico y plan de tratamiento.', duration: 30, price: 40, icon: 'TrendingUp' },
  ];

  for (const treatment of treatments) {
    await prisma.treatment.create({ data: treatment });
  }
  console.log('Seed completed: SUPERADMIN, DENTIST, and', treatments.length, 'treatments created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());