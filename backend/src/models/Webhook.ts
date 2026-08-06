import mongoose, { Document, Schema } from 'mongoose';

export type WebhookStatus = 'success' | 'failed' | 'pending' | 'retrying';
export type WebhookEvent = 
  | 'payment.created' 
  | 'payment.paid' 
  | 'payment.failed' 
  | 'payment.expired' 
  | 'payment.cancelled'
  | 'payment.verified';

export interface IWebhook extends Document {
  webhookId: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
  retryCount: number;
  maxRetries: number;
  lastDeliveryAt?: Date;
  lastStatus?: WebhookStatus;
  lastResponseCode?: number;
  lastResponseBody?: string;
  totalDeliveries: number;
  totalFailures: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWebhookDelivery extends Document {
  webhookId: mongoose.Types.ObjectId;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  status: WebhookStatus;
  responseCode?: number;
  responseBody?: string;
  requestHeaders?: Record<string, string>;
  attemptCount: number;
  errorMessage?: string;
  deliveredAt?: Date;
  createdAt: Date;
}

const webhookSchema = new Schema<IWebhook>(
  {
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
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const { secret: _s, __v: _v, ...clean } = ret;
        return clean;
      },
    },
  }
);

const webhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
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
  },
  {
    timestamps: true,
  }
);

webhookDeliverySchema.index({ webhookId: 1, status: 1 });
webhookDeliverySchema.index({ createdAt: -1 });

export const Webhook = mongoose.model<IWebhook>('Webhook', webhookSchema);
export const WebhookDelivery = mongoose.model<IWebhookDelivery>('WebhookDelivery', webhookDeliverySchema);
