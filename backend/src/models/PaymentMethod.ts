import mongoose, { Document, Schema } from 'mongoose';

export type PaymentMethodCode = 'bkash' | 'nagad' | 'rocket' | 'upay';

export interface IPaymentMethod extends Document {
  code: PaymentMethodCode;
  name: string;
  displayName: string;
  icon?: string;
  isActive: boolean;
  minAmount: number;
  maxAmount: number;
  processingFee: number;
  processingFeeType: 'fixed' | 'percentage';
  accountNumber: string;
  accountName?: string;
  accountType: 'personal' | 'merchant';
  instructions: string;
  /** Permanent Bangla QR image URL (image section on the invoice page). */
  qrImageUrl?: string;
  /** Ordered payment steps shown on the invoice page. */
  steps?: string[];
  /** Warning / notice banner text. */
  warning?: string;
  /** Additional notice shown with instructions. */
  notice?: string;
  /** Theme accent color for the provider (e.g. bKash pink). */
  color?: string;
  sortOrder: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSchema = new Schema<IPaymentMethod>(
  {
    code: {
      type: String,
      enum: ['bkash', 'nagad', 'rocket', 'upay'],
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
    accountName: {
      type: String,
      trim: true,
      default: '',
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
    qrImageUrl: {
      type: String,
      default: '',
    },
    steps: {
      type: [String],
      default: [],
    },
    warning: {
      type: String,
      default: '',
    },
    notice: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

export const PaymentMethod = mongoose.model<IPaymentMethod>('PaymentMethod', paymentMethodSchema);
