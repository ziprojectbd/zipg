import mongoose, { Schema } from 'mongoose';
const paymentRequestSchema = new Schema({
    requestId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    merchantId: {
        type: String,
        index: true,
    },
    apiKeyId: {
        type: Schema.Types.ObjectId,
        ref: 'ApiKey',
    },
    amount: {
        type: Number,
        required: true,
        min: 1,
    },
    currency: {
        type: String,
        default: 'BDT',
        length: 3,
    },
    provider: {
        type: String,
        enum: ['bkash', 'nagad', 'rocket'],
        required: true,
        index: true,
    },
    customerName: {
        type: String,
        required: true,
        trim: true,
    },
    customerPhone: {
        type: String,
        required: true,
        trim: true,
    },
    customerTransactionId: {
        type: String,
        trim: true,
        index: true,
    },
    description: String,
    status: {
        type: String,
        enum: ['pending', 'processing', 'paid', 'failed', 'expired', 'cancelled'],
        default: 'pending',
        index: true,
    },
    callbackUrl: String,
    redirectUrl: String,
    metadata: Schema.Types.Mixed,
    transactionId: String,
    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
}, {
    timestamps: true,
});
paymentRequestSchema.index({ provider: 1, status: 1 });
paymentRequestSchema.index({ status: 1, createdAt: -1 });
export const PaymentRequest = mongoose.model('PaymentRequest', paymentRequestSchema);
