import { SystemSettings, DEFAULT_SETTINGS } from '../models/SystemSettings.js';
import { createActivityLog } from './activityLog.service.js';
import os from 'node:os';
import mongoose from 'mongoose';

/* ────────── Helpers ────────── */

async function getOrCreate(group: string, key: string) {
  let doc = await SystemSettings.findOne({ group, key });
  if (!doc) {
    const defaultVal = DEFAULT_SETTINGS[group] || {};
    doc = await SystemSettings.create({ group, key, value: defaultVal });
  }
  return doc;
}

/* ────────── CRUD ────────── */

export async function getSettings(group: string) {
  const doc = await getOrCreate(group, 'config');
  return doc.value;
}

export async function updateSettings(
  group: string,
  data: Record<string, unknown>,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const doc = await getOrCreate(group, 'config');
  const previous = { ...(doc.value as Record<string, unknown>) };
  const merged = { ...previous, ...data };

  doc.value = merged;
  doc.updatedBy = userId as any;
  await doc.save();

  await createActivityLog({
    userId,
    action: 'settings_updated',
    message: `${group} settings updated`,
    entityType: 'SystemSettings',
    entityId: `${group}/config`,
    severity: 'info',
    ipAddress,
    userAgent,
    metadata: { group, changes: data },
  });

  return merged;
}

export async function getAllSettings() {
  const groups = Object.keys(DEFAULT_SETTINGS);
  const result: Record<string, unknown> = {};

  for (const group of groups) {
    const doc = await getOrCreate(group, 'config');
    result[group] = doc.value;
  }

  return result;
}

/* ────────── System Info ────────── */

export async function getSystemInfo() {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();

  let mongoStatus = 'disconnected';
  try {
    const state = mongoose.connection.readyState;
    mongoStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][state] || 'unknown';
  } catch {}

  return {
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: Math.floor(uptime),
    uptimeFormatted: formatUptime(uptime),
    memory: {
      rss: formatBytes(memUsage.rss),
      heapTotal: formatBytes(memUsage.heapTotal),
      heapUsed: formatBytes(memUsage.heapUsed),
      external: formatBytes(memUsage.external),
    },
    cpu: {
      model: os.cpus()[0]?.model || 'unknown',
      cores: os.cpus().length,
      loadAvg: os.loadavg(),
    },
    mongo: {
      status: mongoStatus,
      host: mongoose.connection.host || 'N/A',
      name: mongoose.connection.name || 'N/A',
    },
    storage: {
      total: formatBytes(os.totalmem()),
      free: formatBytes(os.freemem()),
      used: formatBytes(os.totalmem() - os.freemem()),
    },
  };
}

/* ────────── Formatting helpers ────────── */

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}
