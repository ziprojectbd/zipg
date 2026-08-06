import mongoose, { Schema } from 'mongoose';
const transactionSchema = new Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    paymentRequestId: {
        type: Schema.Types.ObjectId,
        ref: 'PaymentRequest',
        index: true,
    },
    provider: {
        type: String,
        enum: ['bkash', 'nagad', 'rocket'],
        required: true,
        index: true,
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
    customerName: {
        type: String,
        required: true,
        trim: true,
    },
    customerPhone: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    customerTransactionId: {
        type: String,
        trim: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'paid', 'failed', 'expired', 'cancelled'],
        default: 'pending',
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
    deviceId: String,
    smsRaw: String,
    smsSender: String,
    smsReceivedAt: Date,
    verifiedAt: Date,
    verificationMethod: {
        type: String,
        enum: ['sms', 'manual', 'auto'],
    },
    metadata: {
        type: Schema.Types.Mixed,
    },
    notes: String,
    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
}, {
    timestamps: true,
});
transactionSchema.index({ provider: 1, status: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ merchantId: 1, createdAt: -1 });
transactionSchema.index({ createdAt: -1 });
export const Transaction = mongoose.model('Transaction', transactionSchema);
