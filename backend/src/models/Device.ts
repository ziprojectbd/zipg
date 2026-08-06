import mongoose, { Document, Schema } from 'mongoose';

export type DeviceStatus = 'online' | 'offline';

export interface IDevice extends Document {
  deviceId: string;
  name: string;
  status: DeviceStatus;
  provider: 'bkash' | 'nagad' | 'rocket';
  phoneNumber: string;
  androidVersion?: string;
  appVersion?: string;
  batteryLevel?: number;
  networkType?: string;
  isEnabled: boolean;
  isApproved: boolean;
  lastSyncAt?: Date;
  lastSmsAt?: Date;
  totalSmsProcessed: number;
  totalPaymentsMatched: number;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
      index: true,
    },
    provider: {
      type: String,
      enum: ['bkash', 'nagad', 'rocket'],
      required: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    androidVersion: String,
    appVersion: String,
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
    },
    networkType: String,
    isEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    lastSyncAt: Date,
    lastSmsAt: Date,
    totalSmsProcessed: {
      type: Number,
      default: 0,
    },
    totalPaymentsMatched: {
      type: Number,
      default: 0,
    },
    ipAddress: String,
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

deviceSchema.index({ status: 1, isEnabled: 1 });

export const Device = mongoose.model<IDevice>('Device', deviceSchema);
