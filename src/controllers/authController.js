import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendWelcomeEmail } from '../lib/email.js';
import logger from '../lib/logger.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dentalcare-secret';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  return { accessToken, refreshToken };
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword }
    });
    
    const { accessToken, refreshToken } = generateTokens(user);
    
    sendWelcomeEmail(user.email, user.name).catch(err => logger.error('Welcome email error:', err));
    
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, accessToken, refreshToken });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const { accessToken, refreshToken } = generateTokens(user);
    
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, accessToken, refreshToken });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const refreshToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'No hay token de refresh' });
    }
    
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, name: true }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    const tokens = generateTokens(user);
    
    res.json({ 
      message: 'Token actualizado', 
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    logger.error('Refresh error:', error);
    res.status(401).json({ error: 'Token de refresh inválido o expirado' });
  }
};

export const logout = (req, res) => {
  res.json({ message: 'Sesión cerrada' });
};

export const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true }
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    logger.error('Me error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};
