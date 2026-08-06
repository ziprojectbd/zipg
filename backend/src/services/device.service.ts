import { Device } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityLog } from './activityLog.service.js';

interface RegisterDeviceInput {
  deviceId: string;
  name: string;
  provider: 'bkash' | 'nagad' | 'rocket';
  phoneNumber: string;
  androidVersion?: string;
  appVersion?: string;
  batteryLevel?: number;
  networkType?: string;
}

export async function registerDevice(input: RegisterDeviceInput) {
  const existing = await Device.findOne({ deviceId: input.deviceId });
  
  if (existing) {
    // Update existing device
    Object.assign(existing, {
      ...input,
      status: 'online',
      lastSyncAt: new Date(),
    });
    await existing.save();

    await createActivityLog({
      action: 'device_online',
      message: `Device ${input.deviceId} reconnected`,
      entityType: 'Device',
      entityId: input.deviceId,
    });

    return existing;
  }

  const device = await Device.create({
    ...input,
    status: 'online',
    lastSyncAt: new Date(),
    isApproved: false,
    totalSmsProcessed: 0,
    totalPaymentsMatched: 0,
  });

  await createActivityLog({
    action: 'device_registered',
    message: `New device registered: ${input.deviceId} (${input.name})`,
    entityType: 'Device',
    entityId: input.deviceId,
    metadata: { provider: input.provider },
  });

  return device;
}

export async function heartbeat(deviceId: string, data: {
  batteryLevel?: number;
  networkType?: string;
  androidVersion?: string;
  appVersion?: string;
}) {
  const device = await Device.findOneAndUpdate(
    { deviceId },
    {
      $set: {
        status: 'online',
        lastSyncAt: new Date(),
        ...data,
      },
    },
    { new: true }
  );

  if (!device) {
    throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
  }

  return device;
}

export async function getDevice(deviceId: string) {
  const device = await Device.findOne({ deviceId });
  if (!device) {
    throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
  }
  return device;
}

export async function listDevices(query: {
  page?: number;
  limit?: number;
  status?: string;
  provider?: string;
  search?: string;
  isEnabled?: boolean;
}) {
  const filter: Record<string, unknown> = {};

  if (query.status) filter.status = query.status;
  if (query.provider) filter.provider = query.provider;
  if (query.isEnabled !== undefined) filter.isEnabled = query.isEnabled;

  if (query.search) {
    filter.$or = [
      { deviceId: { $regex: query.search, $options: 'i' } },
      { name: { $regex: query.search, $options: 'i' } },
    ];
  }

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [devices, total] = await Promise.all([
    Device.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Device.countDocuments(filter),
  ]);

  const onlineCount = await Device.countDocuments({ status: 'online' });
  const offlineCount = await Device.countDocuments({ status: 'offline' });

  return {
    devices,
    stats: { online: onlineCount, offline: offlineCount, total },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

export async function updateDevice(deviceId: string, data: {
  name?: string;
  provider?: 'bkash' | 'nagad' | 'rocket';
  isEnabled?: boolean;
  isApproved?: boolean;
  phoneNumber?: string;
  batteryLevel?: number;
  networkType?: string;
  androidVersion?: string;
  appVersion?: string;
}) {
  const device = await Device.findOne({ deviceId });
  if (!device) {
    throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
  }

  Object.assign(device, data);
  await device.save();

  if (data.isEnabled !== undefined) {
    await createActivityLog({
      action: data.isEnabled ? 'device_enabled' : 'device_disabled',
      message: `Device ${deviceId} ${data.isEnabled ? 'enabled' : 'disabled'}`,
      entityType: 'Device',
      entityId: deviceId,
    });
  }

  return device;
}

export async function deleteDevice(deviceId: string) {
  const device = await Device.findOneAndDelete({ deviceId });
  if (!device) {
    throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
  }

  await createActivityLog({
    action: 'security_event',
    message: `Device ${deviceId} removed`,
    entityType: 'Device',
    entityId: deviceId,
    severity: 'warning',
  });

  return device;
}

export async function getDeviceStats() {
  const [online, offline, total] = await Promise.all([
    Device.countDocuments({ status: 'online', isEnabled: true }),
    Device.countDocuments({ status: 'offline', isEnabled: true }),
    Device.countDocuments({ isEnabled: true }),
  ]);

  return { online, offline, total };
}
