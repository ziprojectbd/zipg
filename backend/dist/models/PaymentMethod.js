import mongoose, { Schema } from 'mongoose';
const paymentMethodSchema = new Schema({
    code: {
        type: String,
        enum: ['bkash', 'nagad', 'rocket'],
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    displayName: {
        type: String,
        required: true,
    },
    icon: String,
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    minAmount: {
        type: Number,
        default: 10,
    },
    maxAmount: {
        type: Number,
        default: 50000,
    },
    processingFee: {
        type: Number,
        default: 0,
    },
    processingFeeType: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'fixed',
    },
    accountNumber: {
        type: String,
        required: true,
    },
    accountType: {
        type: String,
        enum: ['personal', 'merchant'],
        default: 'personal',
    },
    instructions: {
        type: String,
        default: '',
    },
    sortOrder: {
        type: Number,
        default: 0,
    },
    metadata: Schema.Types.Mixed,
}, {
    timestamps: true,
});
export const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);
