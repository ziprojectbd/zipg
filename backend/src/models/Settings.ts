import mongoose, { Document, Schema } from 'mongoose';

export interface IPaySettings {
  title: string;
  subtitle: string;
  description: string;
  showBranding: boolean;
  primaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  /* ── Branding / invoice defaults (admin-configurable) ── */
  merchantName?: string;
  merchantAccount?: string;
  invoiceHeading?: string;
  invoiceDescription?: string;
  footerText?: string;
  supportEmail?: string;
  supportPhone?: string;
  /* ── Invoice state messages ── */
  pendingPaymentMessage?: string;
  pendingVerificationMessage?: string;
  paidMessage?: string;
  expiredMessage?: string;
  cancelledMessage?: string;
  rejectedMessage?: string;
  supportMessage?: string;
  /* ── Checkout page secure-line text ── */
  securedByText?: string;
}

export interface ISystemSettings {
  siteName: string;
  siteUrl: string;
  defaultCurrency: string;
  paymentExpiryMinutes: number;
  maxPaymentAmount: number;
  minPaymentAmount: number;
  enablePublicPayments: boolean;
  enableMerchantSignup: boolean;
  webhookRetryMax: number;
  webhookRetryDelayMs: number;
  maintenanceMode: boolean;
  smtp?: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
}

export interface ISettings extends Document {
  key: string;
  group: 'pay' | 'system' | 'smtp' | 'notification';
  value: IPaySettings | ISystemSettings | Record<string, unknown>;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    group: {
      type: String,
      enum: ['pay', 'system', 'smtp', 'notification'],
      required: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);
