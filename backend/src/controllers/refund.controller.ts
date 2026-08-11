import { Request, Response, NextFunction } from 'express';
import * as refundService from '../services/refund.service.js';

export async function createRefundController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await refundService.createRefund({ ...req.body, processedBy: req.user?.sub });
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function getRefundController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await refundService.getRefund(String(req.params.refundId));
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function listRefundsController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await refundService.listRefunds(req.query as any);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function processRefundController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await refundService.processRefund(String(req.params.refundId), req.user?.sub as string, req.body.action, req.body.notes);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function cancelRefundController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await refundService.cancelRefund(String(req.params.refundId), req.user?.sub as string, req.body.reason);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function getRefundStatsController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await refundService.getRefundStats();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function getRefundableAmountController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await refundService.getRefundableAmount(String(req.params.transactionId));
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}
