import crypto from 'node:crypto';
import { Webhook, WebhookDelivery, type WebhookEvent, type IWebhook } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityLog } from './activityLog.service.js';
import { appConfig } from '../config/app.js';

interface CreateWebhookInput {
  url: string;
  events: WebhookEvent[];
  secret?: string;
  isActive?: boolean;
  maxRetries?: number;
}

export async function createWebhook(input: CreateWebhookInput) {
  const webhookId = `WH-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const webhook = await Webhook.create({
    webhookId,
    url: input.url,
    secret: input.secret || crypto.randomBytes(24).toString('hex'),
    events: input.events,
    isActive: input.isActive ?? true,
    maxRetries: input.maxRetries || appConfig.webhook.maxRetries,
  });

  await createActivityLog({
    action: 'settings_updated',
    message: `Webhook created: ${webhookId}`,
    entityType: 'Webhook',
    entityId: webhookId,
  });

  return webhook;
}

export async function updateWebhook(
  webhookId: string,
  data: {
    url?: string;
    events?: WebhookEvent[];
    isActive?: boolean;
    maxRetries?: number;
  }
) {
  const webhook = await Webhook.findOne({ webhookId });
  if (!webhook) {
    throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND');
  }

  Object.assign(webhook, data);
  await webhook.save();

  return webhook;
}

export async function deleteWebhook(webhookId: string) {
  const webhook = await Webhook.findOneAndDelete({ webhookId });
  if (!webhook) {
    throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND');
  }
  return webhook;
}

export async function listWebhooks(query: {
  page?: number;
  limit?: number;
  isActive?: boolean;
}) {
  const filter: Record<string, unknown> = {};
  if (query.isActive !== undefined) filter.isActive = query.isActive;

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [webhooks, total] = await Promise.all([
    Webhook.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Webhook.countDocuments(filter),
  ]);

  return {
    webhooks,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total },
  };
}

export async function getWebhookDeliveries(query: {
  webhookId?: string;
  page?: number;
  limit?: number;
  status?: string;
}) {
  const filter: Record<string, unknown> = {};
  if (query.webhookId) filter.webhookId = query.webhookId;
  if (query.status) filter.status = query.status;

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [deliveries, total] = await Promise.all([
    WebhookDelivery.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WebhookDelivery.countDocuments(filter),
  ]);

  return {
    deliveries,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total },
  };
}

export async function triggerWebhook(event: WebhookEvent, payload: Record<string, unknown>) {
  const webhooks = await Webhook.find({
    events: event,
    isActive: true,
  }).select('+secret');

  if (webhooks.length === 0) return;

  const results = await Promise.allSettled(
    webhooks.map((webhook) => deliverWebhook(webhook, event, payload))
  );

  return results;
}

async function deliverWebhook(
  webhook: IWebhook,
  event: WebhookEvent,
  payload: Record<string, unknown>,
  attempt: number = 1
): Promise<void> {
  const timestamp = Date.now().toString();
  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', webhook.secret)
    .update(`${timestamp}${body}`)
    .digest('hex');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), appConfig.webhook.timeout);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-Event': event,
        'X-Webhook-Id': webhook.webhookId,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseBody = await response.text().catch(() => '');

    const delivery = await WebhookDelivery.create({
      webhookId: webhook._id,
      event,
      payload,
      status: response.ok ? 'success' : 'failed',
      responseCode: response.status,
      responseBody,
      attemptCount: attempt,
      deliveredAt: new Date(),
    });

    // Update webhook stats
    await Webhook.updateOne(
      { _id: webhook._id },
      {
        lastDeliveryAt: new Date(),
        lastStatus: delivery.status,
        lastResponseCode: delivery.responseCode,
        lastResponseBody: delivery.responseBody,
        $inc: {
          totalDeliveries: 1,
          totalFailures: response.ok ? 0 : 1,
        },
      }
    );

    if (!response.ok && attempt < webhook.maxRetries) {
      await createActivityLog({
        action: 'webhook_failed',
        message: `Webhook delivery failed (attempt ${attempt}/${webhook.maxRetries}): ${webhook.webhookId}`,
        entityType: 'Webhook',
        entityId: webhook.webhookId,
        severity: 'warning',
      });

      await new Promise((resolve) => setTimeout(resolve, appConfig.webhook.retryDelayMs));
      return deliverWebhook(webhook, event, payload, attempt + 1);
    }

    if (response.ok) {
      await createActivityLog({
        action: 'webhook_delivered',
        message: `Webhook delivered: ${webhook.webhookId} (${event})`,
        entityType: 'Webhook',
        entityId: webhook.webhookId,
      });
    }
  } catch (error: any) {
    const delivery = await WebhookDelivery.create({
      webhookId: webhook._id,
      event,
      payload,
      status: 'failed',
      responseCode: 0,
      errorMessage: error.message,
      attemptCount: attempt,
    });

    await Webhook.updateOne(
      { _id: webhook._id },
      {
        lastDeliveryAt: new Date(),
        lastStatus: 'failed',
        $inc: { totalFailures: 1 },
      }
    );

    if (attempt < webhook.maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, appConfig.webhook.retryDelayMs));
      return deliverWebhook(webhook, event, payload, attempt + 1);
    }

    await createActivityLog({
      action: 'webhook_failed',
      message: `Webhook delivery permanently failed: ${webhook.webhookId} - ${error.message}`,
      entityType: 'Webhook',
      entityId: webhook.webhookId,
      severity: 'error',
    });
  }
}
