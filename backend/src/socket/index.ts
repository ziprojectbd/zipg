import { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { appConfig } from '../config/app.js';
import type { JwtPayload } from '../middleware/auth.js';

let io: Server;

export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: appConfig.cors.origin,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string;
    
    if (!token) {
      // Allow anonymous connections for public events
      socket.data.authenticated = false;
      return next();
    }

    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret, {
        issuer: appConfig.jwt.issuer,
      }) as JwtPayload;
      
      socket.data.user = decoded;
      socket.data.authenticated = true;
      next();
    } catch {
      socket.data.authenticated = false;
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`[zi-pay] Socket connected: ${socket.id}${user ? ` (${user.email})` : ' (anonymous)'}`);

    // Join authenticated users to their role room
    if (user) {
      socket.join(`user:${user.sub}`);
      socket.join(`role:${user.role}`);
    }

    // Join anonymous to public room
    if (!socket.data.authenticated) {
      socket.join('public');
    }

    socket.on('disconnect', () => {
      console.log(`[zi-pay] Socket disconnected: ${socket.id}`);
    });

    socket.emit('connected', {
      service: 'zi-pay',
      timestamp: new Date().toISOString(),
      authenticated: socket.data.authenticated,
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
}

// Helper to emit payment events
export function emitPaymentCreated(payment: unknown) {
  const socketIO = getIO();
  socketIO.to('public').emit('payment.created', payment);
  socketIO.to('role:super_admin').emit('payment.created', payment);
  socketIO.to('role:admin').emit('payment.created', payment);
  socketIO.to('role:operator').emit('payment.created', payment);
}

export function emitPaymentUpdated(payment: unknown) {
  const socketIO = getIO();
  socketIO.to('public').emit('payment.updated', payment);
  socketIO.to('role:super_admin').emit('payment.updated', payment);
  socketIO.to('role:admin').emit('payment.updated', payment);
  socketIO.to('role:operator').emit('payment.updated', payment);
}

export function emitDeviceStatusChanged(device: unknown) {
  const socketIO = getIO();
  socketIO.to('role:super_admin').emit('device.status', device);
  socketIO.to('role:admin').emit('device.status', device);
  socketIO.to('role:operator').emit('device.status', device);
}

export function emitNotification(notification: { type: string; title: string; message: string; severity?: string }) {
  const socketIO = getIO();
  socketIO.to('role:super_admin').emit('notification', notification);
  socketIO.to('role:admin').emit('notification', notification);
  socketIO.to('role:operator').emit('notification', notification);
}

export function emitSettingsUpdated(settings: unknown) {
  const socketIO = getIO();
  socketIO.to('public').emit('pay-settings.updated', settings);
  socketIO.to('role:super_admin').emit('pay-settings.updated', settings);
  socketIO.to('role:admin').emit('pay-settings.updated', settings);
}
