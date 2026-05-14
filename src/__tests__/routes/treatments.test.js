import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'dentalcare-secret';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    treatment: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    }
  })),
}));

import treatmentsRoutes from '../../routes/treatments.js';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, res, next) => {
    const token = req.cookies?.token;
    if (token) {
      try {
        req.user = jwt.verify(token, JWT_SECRET);
      } catch (e) {}
    }
    next();
  });
  app.use('/api/treatments', treatmentsRoutes);
  return app;
};

describe('Treatments Routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  describe('GET /api/treatments (public)', () => {
    it('returns empty array when no treatments', async () => {
      const res = await request(app).get('/api/treatments');
      expect(res.status).toBe(200);
    });

    it('returns 404 when treatment not found', async () => {
      const res = await request(app).get('/api/treatments/999');
      expect(res.status).toBe(404);
    });
  });

  describe('Protected routes - GET /api/treatments/all', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).get('/api/treatments/all');
      expect(res.status).toBe(401);
    });

    it('returns 403 when not SUPERADMIN', async () => {
      const token = jwt.sign({ id: 1, role: 'USER' }, JWT_SECRET);
      const res = await request(app)
        .get('/api/treatments/all')
        .set('Cookie', `token=${token}`);
      expect(res.status).toBe(403);
    });

    it('returns 200 for SUPERADMIN', async () => {
      const token = jwt.sign({ id: 1, role: 'SUPERADMIN' }, JWT_SECRET);
      const res = await request(app)
        .get('/api/treatments/all')
        .set('Cookie', `token=${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/treatments', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).post('/api/treatments').send({ name: 'Test' });
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-SUPERADMIN', async () => {
      const token = jwt.sign({ id: 1, role: 'DENTIST' }, JWT_SECRET);
      const res = await request(app)
        .post('/api/treatments')
        .set('Cookie', `token=${token}`)
        .send({ name: 'Test' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/treatments/:id', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).delete('/api/treatments/1');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-SUPERADMIN', async () => {
      const token = jwt.sign({ id: 1, role: 'USER' }, JWT_SECRET);
      const res = await request(app)
        .delete('/api/treatments/1')
        .set('Cookie', `token=${token}`);
      expect(res.status).toBe(403);
    });
  });
});