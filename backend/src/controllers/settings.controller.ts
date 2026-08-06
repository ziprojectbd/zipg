import { Request, Response, NextFunction } from 'express';
import * as systemSettingsService from '../services/systemSettings.service.js';

const VALID_GROUPS = [
  'general', 'gateway', 'security', 'sms', 'device',
  'merchant', 'notification', 'email', 'api', 'analytics', 'appearance',
];

/* ────────── Get all settings ────────── */
export async function getAllSettingsController(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await systemSettingsService.getAllSettings();
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
}

/* ────────── Get settings by group ────────── */
export async function getSettingsController(req: Request, res: Response, next: NextFunction) {
  try {
    const group = String(req.params.group).toLowerCase();
    if (!VALID_GROUPS.includes(group)) {
      res.status(400).json({ success: false, error: `Invalid settings group: ${group}` });
      return;
    }
    const settings = await systemSettingsService.getSettings(group);
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
}

/* ────────── Update settings by group ────────── */
export async function updateSettingsController(req: Request, res: Response, next: NextFunction) {
  try {
    const group = String(req.params.group).toLowerCase();
    if (!VALID_GROUPS.includes(group)) {
      res.status(400).json({ success: false, error: `Invalid settings group: ${group}` });
      return;
    }
    const userId = req.user?.sub;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || undefined;
    const userAgent = req.headers['user-agent'] || undefined;
    const settings = await systemSettingsService.updateSettings(group, req.body, userId, ipAddress as string, userAgent);
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
}

/* ────────── System info ────────── */
export async function getSystemInfoController(_req: Request, res: Response, next: NextFunction) {
  try {
    const info = await systemSettingsService.getSystemInfo();
    res.json({ success: true, data: info });
  } catch (error) { next(error); }
}

/* ────────── Test email ────────── */
export async function testEmailController(req: Request, res: Response, next: NextFunction) {
  try {
    const { to } = req.body;
    // In production, use nodemailer. For now, return success.
    res.json({
      success: true,
      message: `Test email would be sent to ${to}. Configure SMTP in production.`,
    });
  } catch (error) { next(error); }
}
