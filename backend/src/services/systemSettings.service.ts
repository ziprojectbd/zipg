import { SystemSettings, DEFAULT_SETTINGS } from '../models/SystemSettings.js';
import { createActivityLog } from './activityLog.service.js';
import { emitAdminSettingsUpdated } from '../socket/index.js';
import os from 'node:os';
import mongoose from 'mongoose';

/* ────────── Helpers ────────── */

/**
 * Fetch the settings document for a group, creating it on first use.
 *
 * Uses an atomic upsert on the (group, key) unique index instead of
 * find-then-create: two concurrent requests for the same group previously
 * raced and the loser surfaced a DUPLICATE_ENTRY 409 to the admin.
 */
async function getOrCreate(group: string, key: string) {
  const defaultVal = DEFAULT_SETTINGS[group] || {};
  const doc = await SystemSettings.findOneAndUpdate(
    { group, key },
    { $setOnInsert: { group, key, value: defaultVal } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc;
}

/* ────────── CRUD ────────── */

export async function getSettings(group: string) {
  const doc = await getOrCreate(group, 'config');
  // Merge with defaults so a group seeded before a default was introduced (or
  // seeded empty by a migration) still returns a complete, usable config.
  const defaults = DEFAULT_SETTINGS[group] || {};
  return { ...defaults, ...(doc.value as Record<string, unknown>) };
}

export async function updateSettings(
  group: string,
  data: Record<string, unknown>,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const doc = await getOrCreate(group, 'config');
  const defaults = DEFAULT_SETTINGS[group] || {};
  // Merge defaults first so partial writes never drop untouched defaults.
  const previous = { ...defaults, ...(doc.value as Record<string, unknown>) };
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

  // Push the new config to every connected admin so open tabs re-render.
  emitAdminSettingsUpdated({ group, settings: merged });

  return merged;
}

export async function getAllSettings() {
  const groups = Object.keys(DEFAULT_SETTINGS);
  const result: Record<string, unknown> = {};

  for (const group of groups) {
    const doc = await getOrCreate(group, 'config');
    const defaults = DEFAULT_SETTINGS[group] || {};
    result[group] = { ...defaults, ...(doc.value as Record<string, unknown>) };
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
