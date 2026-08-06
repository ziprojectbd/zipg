import * as webhookService from '../services/webhook.service.js';
export async function createWebhookController(req, res, next) {
    try {
        const webhook = await webhookService.createWebhook(req.body);
        res.status(201).json({ success: true, data: webhook });
    }
    catch (error) {
        next(error);
    }
}
export async function listWebhooksController(req, res, next) {
    try {
        const result = await webhookService.listWebhooks(req.query);
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
}
export async function getWebhookController(req, res, next) {
    try {
        const { Webhook } = await import('../models/index.js');
        const webhook = await Webhook.findById(String(req.params.id));
        if (!webhook) {
            res.status(404).json({ success: false, error: 'Webhook not found', code: 'WEBHOOK_NOT_FOUND' });
            return;
        }
        res.json({ success: true, data: webhook });
    }
    catch (error) {
        next(error);
    }
}
export async function updateWebhookController(req, res, next) {
    try {
        const webhook = await webhookService.updateWebhook(String(req.params.id), req.body);
        res.json({ success: true, data: webhook });
    }
    catch (error) {
        next(error);
    }
}
export async function deleteWebhookController(req, res, next) {
    try {
        const webhook = await webhookService.deleteWebhook(String(req.params.id));
        res.json({ success: true, data: webhook });
    }
    catch (error) {
        next(error);
    }
}
export async function webhookDeliveriesController(req, res, next) {
    try {
        const result = await webhookService.getWebhookDeliveries({
            ...req.query,
            webhookId: String(req.params.id),
        });
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
}
