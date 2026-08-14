import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentSession extends Document {
  token: string;
  amount: number;
  currency: string;
  orderId: string;
  email: string;
  status: 'pending' | 'paid' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSessionSchema = new Schema<IPaymentSession>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
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
    },
    orderId: {
      type: String,
      default: '',
      maxlength: 200,
    },
    email: {
      type: String,
      default: '',
      maxlength: 320,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'expired'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Clean up expired sessions automatically (TTL).
paymentSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PaymentSession = mongoose.model<IPaymentSession>('PaymentSession', paymentSessionSchema);
