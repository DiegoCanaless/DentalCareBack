import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    }
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

import { PrismaClient } from '@prisma/client';
import authRoutes from '../../routes/auth.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

const JWT_SECRET = 'dentalcare-secret';

describe('Auth Routes', () => {
  let prisma;

  beforeEach(() => {
    prisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'password123' });
      expect(res.status).toBe(400);
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', password: 'password123' });
      expect(res.status).toBe(400);
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'test@test.com' });
      expect(res.status).toBe(400);
    });

    it('should return 400 if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'test@test.com' });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'test@test.com', password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('El email ya está registrado');
    });

    it('should create user and return token on success', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: 'USER'
      });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test User', email: 'test@test.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: 'USER'
      }));
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });
      expect(res.status).toBe(400);
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com' });
      expect(res.status).toBe(400);
    });

    it('should return 401 if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password123' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciales inválidas');
    });

    it('should return 401 if password is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password: '$2a$10$hashedpassword'
      });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciales inválidas');
    });

    it('should return user and token on success', async () => {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: 'USER',
        password: hashedPassword
      });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: 'USER'
      }));
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear cookie and return message', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Sesión cerrada');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return user data if authenticated', async () => {
      const token = jwt.sign({ id: 1, email: 'test@test.com', role: 'USER' }, JWT_SECRET);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: 'USER'
      });
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: 'USER'
      }));
    });

    it('should return 404 if user not found', async () => {
      const token = jwt.sign({ id: 999, email: 'test@test.com', role: 'USER' }, JWT_SECRET);
      prisma.user.findUnique.mockResolvedValue(null);
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${token}`);
      expect(res.status).toBe(404);
    });
  });
});