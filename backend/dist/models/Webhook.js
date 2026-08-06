import mongoose, { Schema } from 'mongoose';
const webhookSchema = new Schema({
    webhookId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    url: {
        type: String,
        required: true,
    },
    secret: {
        type: String,
        required: true,
        select: false,
    },
    events: {
        type: [String],
        default: ['payment.paid', 'payment.failed'],
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    retryCount: {
        type: Number,
        default: 0,
    },
    maxRetries: {
        type: Number,
        default: 3,
    },
    lastDeliveryAt: Date,
    lastStatus: String,
    lastResponseCode: Number,
    lastResponseBody: String,
    totalDeliveries: {
        type: Number,
        default: 0,
    },
    totalFailures: {
        type: Number,
        default: 0,
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
const webhookDeliverySchema = new Schema({
    webhookId: {
        type: Schema.Types.ObjectId,
        ref: 'Webhook',
        required: true,
        index: true,
    },
    event: {
        type: String,
        required: true,
    },
    payload: {
        type: Schema.Types.Mixed,
        required: true,
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'pending', 'retrying'],
        default: 'pending',
        index: true,
    },
    responseCode: Number,
    responseBody: String,
    requestHeaders: Schema.Types.Mixed,
    attemptCount: {
        type: Number,
        default: 1,
    },
    errorMessage: String,
    deliveredAt: Date,
}, {
    timestamps: true,
});
webhookDeliverySchema.index({ webhookId: 1, status: 1 });
webhookDeliverySchema.index({ createdAt: -1 });
export const Webhook = mongoose.model('Webhook', webhookSchema);
export const WebhookDelivery = mongoose.model('WebhookDelivery', webhookDeliverySchema);
