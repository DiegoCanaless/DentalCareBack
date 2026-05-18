import jwt from 'jsonwebtoken';
import { authenticate, requireRole } from '../../middleware/auth.js';

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    it('should return 401 if no token provided', () => {
      authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No autenticado' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token inválido' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header has wrong format', () => {
      mockReq.headers = { authorization: 'InvalidFormat token' };
      authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should call next and set user if token is valid', () => {
      const token = jwt.sign({ id: 1, email: 'test@test.com', role: 'USER' }, 'dentalcare-secret');
      mockReq.headers = { authorization: `Bearer ${token}` };
      authenticate(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual(expect.objectContaining({
        id: 1,
        email: 'test@test.com',
        role: 'USER'
      }));
    });
  });

  describe('requireRole', () => {
    it('should return 403 if user has no role', () => {
      mockReq.user = { id: 1, role: undefined };
      const middleware = requireRole('SUPERADMIN');
      middleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No tienes permisos para esta acción' });
    });

    it('should return 403 if user role not in allowed roles', () => {
      mockReq.user = { id: 1, role: 'USER' };
      const middleware = requireRole('SUPERADMIN', 'DENTIST');
      middleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No tienes permisos para esta acción' });
    });

    it('should call next if user role is allowed', () => {
      mockReq.user = { id: 1, role: 'SUPERADMIN' };
      const middleware = requireRole('SUPERADMIN', 'DENTIST');
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow multiple roles correctly', () => {
      mockReq.user = { id: 1, role: 'DENTIST' };
      const middleware = requireRole('SUPERADMIN', 'DENTIST', 'USER');
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});