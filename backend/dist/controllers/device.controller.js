import * as deviceService from '../services/device.service.js';
/* ────────── Admin ────────── */
export async function registerDeviceController(req, res, next) {
    try {
        const device = await deviceService.registerDevice(req.body);
        res.status(201).json({
            success: true,
            data: device,
        });
    }
    catch (error) {
        next(error);
    }
}
export async function listDevicesController(req, res, next) {
    try {
        const result = await deviceService.listDevices(req.query);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
}
export async function getDeviceController(req, res, next) {
    try {
        const { deviceId } = req.params;
        const device = await deviceService.getDevice(String(deviceId));
        res.json({
            success: true,
            data: device,
        });
    }
    catch (error) {
        next(error);
    }
}
export async function updateDeviceController(req, res, next) {
    try {
        const { deviceId } = req.params;
        const device = await deviceService.updateDevice(String(deviceId), req.body);
        res.json({
            success: true,
            data: device,
        });
    }
    catch (error) {
        next(error);
    }
}
export async function deleteDeviceController(req, res, next) {
    try {
        const { deviceId } = req.params;
        const device = await deviceService.deleteDevice(String(deviceId));
        res.json({
            success: true,
            data: device,
        });
    }
    catch (error) {
        next(error);
    }
}
export async function deviceStatsController(_req, res, next) {
    try {
        const stats = await deviceService.getDeviceStats();
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        next(error);
    }
}
/* ────────── Device (from Android) ────────── */
export async function heartbeatController(req, res, next) {
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
    }
    catch (error) {
        next(error);
    }
}
