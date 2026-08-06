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
import { appConfig } from './config/app.js';
import { globalLimiter, errorHandler, notFoundHandler } from './middleware/index.js';
import { initializeSocket } from './socket/index.js';
import { startCronJobs } from './cron/index.js';
import authRoutes from './routes/auth.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import adminRoutes from './routes/admin.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import publicRoutes from './routes/public.routes.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '../../frontend/dist');
const app = express();
const server = http.createServer(app);
/* ────────── Security & Middleware ────────── */
app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: appConfig.isProduction
        ? {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                imgSrc: ["'self'", 'data:', 'blob:'],
                connectSrc: ["'self'", 'ws:', 'wss:'],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
            },
        }
        : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
    origin: appConfig.isProduction ? false : appConfig.cors.origin,
    credentials: true,
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
/* ────────── API Routes ────────── */
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/public', publicRoutes);
/* ────────── Static Frontend (Production) ────────── */
app.use(express.static(FRONTEND_DIR, { maxAge: appConfig.isProduction ? '30d' : 0 }));
/* ────────── SPA Fallback ────────── */
app.use((req, res, next) => {
    if (req.path.startsWith('/api/') ||
        req.path.startsWith('/uploads/') ||
        req.path.startsWith('/socket.io') ||
        req.path === '/health') {
        return next();
    }
    if (req.method === 'GET' && !req.path.includes('.')) {
        return res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
    }
    next();
});
/* ────────── Error Handling ────────── */
app.use(notFoundHandler);
app.use(errorHandler);
/* ────────── Start ────────── */
async function start() {
    try {
        // Connect to MongoDB
        await connectDatabase();
        // Initialize Socket.IO
        initializeSocket(server);
        // Start cron jobs
        startCronJobs();
        const PORT = appConfig.port;
        server.listen(PORT, () => {
            console.log(`\n[zi-pay] 🚀 Server running on http://localhost:${PORT}`);
            console.log(`[zi-pay] 🌍 Environment: ${appConfig.nodeEnv}`);
            console.log(`[zi-pay] 📡 Socket.IO ready`);
            console.log(`[zi-pay] ⏰ Cron jobs active`);
            console.log(`[zi-pay] 🔐 JWT issuer: ${appConfig.jwt.issuer}\n`);
        });
    }
    catch (error) {
        console.error('[zi-pay] Failed to start server:', error);
        process.exit(1);
    }
}
/* ────────── Graceful Shutdown ────────── */
async function shutdown(signal) {
    console.log(`\n[zi-pay] ${signal} received. Shutting down gracefully...`);
    server.close(async () => {
        // Stop cron jobs
        const { stopCronJobs } = await import('./cron/index.js');
        stopCronJobs();
        // Disconnect MongoDB
        const { disconnectDatabase } = await import('./config/database.js');
        await disconnectDatabase();
        console.log('[zi-pay] Server shut down complete');
        process.exit(0);
    });
    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.error('[zi-pay] Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
start();
export { app, server };
