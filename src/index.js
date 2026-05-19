import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import treatmentRoutes from './routes/treatments.js';
import appointmentRoutes from './routes/appointments.js';
import usersRoutes from './routes/users.js';
import statsRoutes from './routes/stats.js';
import { generalLimiter } from './middleware/rateLimiter.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: (origin, callback) => {
    const allowed = origin === FRONTEND_URL || 
                    origin === FRONTEND_URL.replace(/\/$/, '') ||
                    !origin;
    callback(null, allowed);
  },
  credentials: true
}));
app.use(generalLimiter);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/treatments', treatmentRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-appointments', (room) => {
    socket.join(room);
  });
  
  socket.on('leave-appointments', (room) => {
    socket.leave(room);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

export { io };

httpServer.listen(PORT, () => {
  console.log(`DentalCare API running on http://localhost:${PORT}`);
});
