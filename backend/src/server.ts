import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { connectDatabase } from './config/database.js';
import { appConfig, validateEnv } from './config/app.js';
import { globalLimiter, errorHandler, notFoundHandler } from './middleware/index.js';
import { initializeSocket } from './socket/index.js';
import { startCronJobs } from './cron/index.js';
import { migrateLegacyInvoices } from './utils/migrateLegacyInvoices.js';

import authRoutes from './routes/auth.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import adminRoutes from './routes/admin.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import publicRoutes from './routes/public.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

/* ────────── Environment Validation ────────── */
validateEnv();

/* ────────── Security & Middleware ────────── */
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'https://accounts.google.com'],
      frameSrc: ["'self'", 'https://accounts.google.com'],
      objectSrc: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
}));

app.use(cors({
  origin: appConfig.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(appConfig.isProduction ? 'combined' : 'dev'));
app.use(globalLimiter);

/* ────────── Static Uploads ────────── */
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads'), { maxAge: '7d' }));

/* ────────── Health ────────── */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'zi-pay-api',
    version: '1.0.0',
    environment: appConfig.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

/* ────────── API v1 Routes ────────── */
const apiV1 = express.Router();
apiV1.use('/auth', authRoutes);
apiV1.use('/payments', paymentRoutes);
apiV1.use('/invoices', invoiceRoutes);
apiV1.use('/admin', adminRoutes);
apiV1.use('/admin/settings', settingsRoutes);
apiV1.use('/webhooks', webhookRoutes);
apiV1.use('/public', publicRoutes);

app.use('/api/v1', apiV1);

/* ────────── Legacy API Routes (backward compatibility) ────────── */
const apiLegacy = express.Router();
apiLegacy.use('/auth', authRoutes);
apiLegacy.use('/payments', paymentRoutes);
apiLegacy.use('/invoices', invoiceRoutes);
apiLegacy.use('/admin', adminRoutes);
apiLegacy.use('/admin/settings', settingsRoutes);
apiLegacy.use('/webhooks', webhookRoutes);
apiLegacy.use('/public', publicRoutes);

app.use('/api', apiLegacy);

/* ────────── Error Handling ────────── */
app.use(notFoundHandler);
app.use(errorHandler);

/* ────────── Start ────────── */
async function start() {
  try {
    await connectDatabase();
    // Backfill secure invoice fields on legacy pending invoices (idempotent).
    await migrateLegacyInvoices();
    initializeSocket(server);
    startCronJobs();

    const PORT = appConfig.port;
    server.listen(PORT, () => {
      console.log(`\n[zi-pay] 🚀 Server running on port ${PORT}`);
      console.log(`[zi-pay] 🌍 Environment: ${appConfig.nodeEnv}`);
      console.log(`[zi-pay] 📡 API v1: /api/v1`);
      console.log(`[zi-pay] 📡 Socket.IO ready`);
      console.log(`[zi-pay] ⏰ Cron jobs active`);
      console.log(`[zi-pay] 🔐 JWT issuer: ${appConfig.jwt.issuer}\n`);
    });

  } catch (error) {
    console.error('[zi-pay] Failed to start server:', error);
    process.exit(1);
  }
}

/* ────────── Graceful Shutdown ────────── */
async function shutdown(signal: string) {
  console.log(`\n[zi-pay] ${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    const { stopCronJobs } = await import('./cron/index.js');
    stopCronJobs();

    const { disconnectDatabase } = await import('./config/database.js');
    await disconnectDatabase();

    console.log('[zi-pay] Server shut down complete');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[zi-pay] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();

export { app, server };
