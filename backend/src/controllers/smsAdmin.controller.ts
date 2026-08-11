import { Request, Response, NextFunction } from 'express';
import * as smsParserService from '../services/smsParser.service.js';
import * as manualVerificationService from '../services/manualVerification.service.js';

/* ────────── SMS Transactions ────────── */

export async function listSmsTransactionsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await smsParserService.listSmsTransactions(req.query as any);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function getSmsTransactionController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await smsParserService.getSmsTransaction(String(req.params.id));
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function smsTransactionStatsController(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await smsParserService.getSmsTransactionStats();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

/* ────────── SMS Parser ────────── */

export async function testSmsParserController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await smsParserService.testParser(
      String(req.body.rawSms),
      req.body.provider
    );
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function getParserRulesController(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await smsParserService.getParserRules();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function updateParserRulesController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await smsParserService.updateParserRules(
      req.body.parserRules,
      req.user?.sub as string
    );
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

/* ────────── Manual Verification ────────── */

export async function getPendingVerificationsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await manualVerificationService.getPendingVerifications(req.query as any);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function verifySmsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await manualVerificationService.verifyTransaction(
      String(req.params.id),
      req.user?.sub as string,
      req.body.notes as string | undefined
    );
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function rejectSmsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await manualVerificationService.rejectTransaction(
      String(req.params.id),
      req.user?.sub as string,
      req.body.reason as string | undefined
    );
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}