import { Request, Response, NextFunction } from 'express';
import * as webhookService from '../services/webhook.service.js';

export async function createWebhookController(req: Request, res: Response, next: NextFunction) {
  try {
    const webhook = await webhookService.createWebhook(req.body);
    res.status(201).json({ success: true, data: webhook });
  } catch (error) { next(error); }
}

export async function listWebhooksController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await webhookService.listWebhooks(req.query as any);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function getWebhookController(req: Request, res: Response, next: NextFunction) {
  try {
    const { Webhook } = await import('../models/index.js');
    const webhook = await Webhook.findById(String(req.params.id));
    if (!webhook) {
      res.status(404).json({ success: false, error: 'Webhook not found', code: 'WEBHOOK_NOT_FOUND' });
      return;
    }
    res.json({ success: true, data: webhook });
  } catch (error) { next(error); }
}

export async function updateWebhookController(req: Request, res: Response, next: NextFunction) {
  try {
    const webhook = await webhookService.updateWebhook(String(req.params.id), req.body);
    res.json({ success: true, data: webhook });
  } catch (error) { next(error); }
}

export async function deleteWebhookController(req: Request, res: Response, next: NextFunction) {
  try {
    const webhook = await webhookService.deleteWebhook(String(req.params.id));
    res.json({ success: true, data: webhook });
  } catch (error) { next(error); }
}

export async function webhookDeliveriesController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await webhookService.getWebhookDeliveries({
      ...req.query,
      webhookId: String(req.params.id),
    } as any);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}
