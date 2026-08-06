import mongoose, { Schema } from 'mongoose';
const sessionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    token: {
        type: String,
        required: true,
        index: true,
    },
    ipAddress: {
        type: String,
        required: true,
    },
    userAgent: {
        type: String,
        required: true,
    },
    deviceInfo: String,
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
    lastActivityAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
sessionSchema.index({ userId: 1, isActive: 1 });
export const Session = mongoose.model('Session', sessionSchema);
