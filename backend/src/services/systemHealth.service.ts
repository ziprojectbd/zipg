import mongoose from 'mongoose';
import os from 'node:os';
import { Transaction, Device, Session, PaymentRequest } from '../models/index.js';

/* ────────── Types ────────── */

type HealthStatus = 'healthy' | 'degraded' | 'down' | 'info';

interface ComponentHealth {
  status: HealthStatus;
  [key: string]: unknown;
}

/* ────────── Helpers ────────── */

function worstStatus(statuses: HealthStatus[]): HealthStatus {
  const rank: Record<HealthStatus, number> = {
    healthy: 0,
    info: 0,
    degraded: 1,
    down: 2,
  };
  let worst: HealthStatus = 'healthy';
  for (const s of statuses) {
    if (rank[s] > rank[worst]) worst = s;
  }
  return worst;
}

function formatBytes(bytes: number): { bytes: number; formatted: string } {
  if (bytes === 0) return { bytes: 0, formatted: '0 B' };
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return {
    bytes,
    formatted: `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`,
  };
}

/* ────────── System Health ────────── */

export async function getSystemHealth() {
  const now = new Date();

  // ── Database ──
  let dbStatus: HealthStatus = 'healthy';
  let dbLatency = 0;
  let dbCollections = 0;
  try {
    const start = Date.now();
    await mongoose.connection.db!.admin().command({ ping: 1 });
    dbLatency = Date.now() - start;
    dbCollections =
      (await mongoose.connection.db!.listCollections().toArray()).length || 0;
    if (dbLatency > 500) dbStatus = 'degraded';
    if (dbLatency > 2000) dbStatus = 'down';
  } catch {
    dbStatus = 'down';
  }
  const database: ComponentHealth = {
    status: dbStatus,
    latency: dbLatency,
    collections: dbCollections,
  };

  // ── Server ──
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsed = memTotal - memFree;
  const memPercentage = memTotal > 0 ? Math.round((memUsed / memTotal) * 1000) / 10 : 0;

  let serverStatus: HealthStatus = 'healthy';
  if (memPercentage > 85) serverStatus = 'degraded';
  if (memPercentage > 95) serverStatus = 'down';

  const server: ComponentHealth = {
    status: serverStatus,
    uptime: os.uptime(),
    memory: {
      total: formatBytes(memTotal),
      free: formatBytes(memFree),
      used: formatBytes(memUsed),
      percentage: memPercentage,
    },
    cpu: {
      cores: os.cpus().length,
      loadAverage: os.loadavg(),
    },
    platform: os.platform(),
    nodeVersion: process.version,
  };

  // ── Payments ──
  let paymentsStatus: HealthStatus = 'healthy';
  const [pendingCount, processingCount, oldestPendingArr] = await Promise.all([
    Transaction.countDocuments({ status: 'pending' }),
    Transaction.countDocuments({ status: 'processing' }),
    Transaction.find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(1)
      .select('createdAt')
      .lean(),
  ]);
  const oldestPending = oldestPendingArr[0]?.createdAt || null;

  if (pendingCount > 100) paymentsStatus = 'degraded';
  if (pendingCount > 500) paymentsStatus = 'down';
  // If oldest pending is older than 1 hour, degrade
  if (oldestPending) {
    const age = now.getTime() - new Date(oldestPending).getTime();
    if (age > 60 * 60 * 1000 && paymentsStatus !== 'down') {
      paymentsStatus = 'degraded';
    }
  }

  const payments: ComponentHealth = {
    status: paymentsStatus,
    pendingCount,
    processingCount,
    oldestPending,
  };

  // ── Devices ──
  const [devicesTotal, devicesOnline] = await Promise.all([
    Device.countDocuments({ isEnabled: true }),
    Device.countDocuments({
      isEnabled: true,
      lastSyncAt: { $gte: new Date(now.getTime() - 5 * 60 * 1000) },
    }),
  ]);
  const devicesOffline = devicesTotal - devicesOnline;

  let devicesStatus: HealthStatus = 'healthy';
  if (devicesTotal > 0 && devicesOnline / devicesTotal < 0.5) {
    devicesStatus = 'degraded';
  }
  if (devicesOnline === 0 && devicesTotal > 0) {
    devicesStatus = 'down';
  }

  const devices: ComponentHealth = {
    status: devicesStatus,
    total: devicesTotal,
    online: devicesOnline,
    offline: devicesOffline,
  };

  // ── Sockets ──
  const sockets: ComponentHealth = {
    status: 'info',
    connections: 0,
    note: 'Socket.io connection count not available from service layer. Access via Socket.io server instance.',
  };

  // ── Overall ──
  const overallStatus = worstStatus([
    database.status,
    server.status,
    payments.status,
    devices.status,
  ]);

  return {
    status: overallStatus,
    timestamp: now,
    database,
    server,
    payments,
    devices,
    sockets,
  };
}

/* ────────── Uptime ────────── */

export function getUptime() {
  const processUptime = process.uptime();
  const osUptime = os.uptime();
  const lastRestart = new Date(Date.now() - processUptime * 1000);

  return {
    process: {
      uptime: processUptime,
      formatted: formatUptime(processUptime),
    },
    system: {
      uptime: osUptime,
      formatted: formatUptime(osUptime),
    },
    lastRestart,
  };
}

/* ────────── Resource Usage ────────── */

export function getResourceUsage() {
  // CPU
  const cpus = os.cpus();
  const loadAvg = os.loadavg();
  const cpuCount = cpus.length;
  // Percentage based on 1-minute load average relative to core count
  const cpuPercentage =
    cpuCount > 0
      ? Math.round((loadAvg[0] / cpuCount) * 10000) / 100
      : 0;

  // Memory
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsed = memTotal - memFree;
  const memPercentage =
    memTotal > 0 ? Math.round((memUsed / memTotal) * 10000) / 100 : 0;

  // Active handles (Node.js internal)
  let activeHandles: number | null = null;
  try {
    if (typeof (process as any)._getActiveHandles === 'function') {
      activeHandles = (process as any)._getActiveHandles().length;
    }
  } catch {
    // Not available in all environments
  }

  return {
    cpu: {
      cores: cpuCount,
      model: cpus[0]?.model || 'unknown',
      loadAverage: {
        '1m': loadAvg[0],
        '5m': loadAvg[1],
        '15m': loadAvg[2],
      },
      percentage: cpuPercentage,
    },
    memory: {
      total: formatBytes(memTotal),
      free: formatBytes(memFree),
      used: formatBytes(memUsed),
      percentage: memPercentage,
    },
    disk: {
      note: 'Disk usage not available from Node.js process. Use system-level monitoring tools.',
      available: null,
    },
    activeHandles,
    processMemory: (() => {
      const mem = process.memoryUsage();
      return {
        rss: formatBytes(mem.rss),
        heapTotal: formatBytes(mem.heapTotal),
        heapUsed: formatBytes(mem.heapUsed),
        external: formatBytes(mem.external),
      };
    })(),
  };
}

/* ────────── Formatting ────────── */

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}
