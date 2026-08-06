import { Request, Response, NextFunction } from 'express';
import * as deviceService from '../services/device.service.js';

/* ────────── Admin ────────── */
export async function registerDeviceController(req: Request, res: Response, next: NextFunction) {
  try {
    const device = await deviceService.registerDevice(req.body);

    res.status(201).json({
      success: true,
      data: device,
    });
  } catch (error) {
    next(error);
  }
}

export async function listDevicesController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await deviceService.listDevices(req.query as any);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDeviceController(req: Request, res: Response, next: NextFunction) {
  try {
    const { deviceId } = req.params;
    const device = await deviceService.getDevice(String(deviceId));

    res.json({
      success: true,
      data: device,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDeviceController(req: Request, res: Response, next: NextFunction) {
  try {
    const { deviceId } = req.params;
    const device = await deviceService.updateDevice(String(deviceId), req.body);

    res.json({
      success: true,
      data: device,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteDeviceController(req: Request, res: Response, next: NextFunction) {
  try {
    const { deviceId } = req.params;
    const device = await deviceService.deleteDevice(String(deviceId));

    res.json({
      success: true,
      data: device,
    });
  } catch (error) {
    next(error);
  }
}

export async function deviceStatsController(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await deviceService.getDeviceStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

/* ────────── Device (from Android) ────────── */
export async function heartbeatController(req: Request, res: Response, next: NextFunction) {
  try {
    const { deviceId } = req.body;
    const device = await deviceService.heartbeat(deviceId, {
      batteryLevel: req.body.batteryLevel,
      networkType: req.body.networkType,
      androidVersion: req.body.androidVersion,
      appVersion: req.body.appVersion,
    });

    res.json({
      success: true,
      data: device,
    });
  } catch (error) {
    next(error);
  }
}
