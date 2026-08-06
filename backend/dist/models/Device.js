import mongoose, { Schema } from 'mongoose';
const deviceSchema = new Schema({
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
}, {
    timestamps: true,
});
deviceSchema.index({ status: 1, isEnabled: 1 });
export const Device = mongoose.model('Device', deviceSchema);
