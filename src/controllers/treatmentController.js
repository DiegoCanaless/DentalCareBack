import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getTreatments = async (req, res) => {
  try {
    const treatments = await prisma.treatment.findMany({
      where: { available: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(treatments);
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const getAllTreatments = async (req, res) => {
  try {
    const treatments = await prisma.treatment.findMany({
      orderBy: { createdAt: 'asc' }
    });
    res.json(treatments);
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const getTreatment = async (req, res) => {
  try {
    const { id } = req.params;
    const treatment = await prisma.treatment.findUnique({ where: { id: parseInt(id) } });
    if (!treatment) {
      return res.status(404).json({ error: 'Tratamiento no encontrado' });
    }
    res.json(treatment);
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const createTreatment = async (req, res) => {
  try {
    const { name, description, duration, price, icon } = req.body;
    if (!name || !description || !duration || !price) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    const treatment = await prisma.treatment.create({
      data: { name, description, duration, price, icon: icon || 'Star' }
    });
    res.json(treatment);
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const updateTreatment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, duration, price, icon, available } = req.body;
    const treatment = await prisma.treatment.update({
      where: { id: parseInt(id) },
      data: { name, description, duration, price, icon, available }
    });
    res.json(treatment);
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const deleteTreatment = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('DELETE treatment called with id:', id);
    console.log('User role:', req.user?.role);
    await prisma.treatment.update({
      where: { id: parseInt(id) },
      data: { available: false }
    });
    res.json({ message: 'Tratamiento deshabilitado' });
  } catch (error) {
    console.error('Error deleting treatment:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};
