import mongoose, { Schema } from 'mongoose';
const apiKeySchema = new Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    secret: {
        type: String,
        required: true,
        select: false,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    merchantId: {
        type: String,
        required: true,
        index: true,
    },
    merchantName: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    isRevoked: {
        type: Boolean,
        default: false,
    },
    revokedAt: Date,
    expiresAt: Date,
    lastUsedAt: Date,
    usageCount: {
        type: Number,
        default: 0,
    },
    ipWhitelist: [String],
    permissions: {
        type: [String],
        default: ['payment:create', 'payment:read'],
    },
    metadata: Schema.Types.Mixed,
}, {
    timestamps: true,
    toJSON: {
        transform(_doc, ret) {
            const { secret: _s, __v: _v, ...clean } = ret;
            return clean;
        },
    },
});
export const ApiKey = mongoose.model('ApiKey', apiKeySchema);
