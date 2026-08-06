import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { ApiKey } from '../models/index.js';

declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        merchantId: string;
        merchantName: string;
        key: string;
        permissions: string[];
      };
    }
  }
}

export async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKeyHeader = req.headers['x-api-key'] as string;
  const signatureHeader = req.headers['x-signature'] as string;
  const timestampHeader = req.headers['x-timestamp'] as string;

  if (!apiKeyHeader) {
    res.status(401).json({
      success: false,
      error: 'API key is required',
      code: 'API_KEY_REQUIRED',
    });
    return;
  }

  const apiKeyDoc = await ApiKey.findOne({
    key: apiKeyHeader,
    isActive: true,
    isRevoked: false,
  }).select('+secret');

  if (!apiKeyDoc) {
    res.status(401).json({
      success: false,
      error: 'Invalid or revoked API key',
      code: 'API_KEY_INVALID',
    });
    return;
  }

  // Check expiration
  if (apiKeyDoc.expiresAt && apiKeyDoc.expiresAt < new Date()) {
    res.status(401).json({
      success: false,
      error: 'API key has expired',
      code: 'API_KEY_EXPIRED',
    });
    return;
  }

  // Check IP whitelist
  if (apiKeyDoc.ipWhitelist.length > 0) {
    const clientIp = req.ip || req.socket.remoteAddress || '';
    if (!apiKeyDoc.ipWhitelist.includes(clientIp)) {
      res.status(403).json({
        success: false,
        error: 'IP address not whitelisted',
        code: 'IP_NOT_WHITELISTED',
      });
      return;
    }
  }

  // Verify signature if provided
  if (signatureHeader && timestampHeader) {
    const timestamp = parseInt(timestampHeader, 10);
    const now = Date.now();
    
    // Reject if timestamp is more than 5 minutes old
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      res.status(401).json({
        success: false,
        error: 'Request timestamp expired',
        code: 'TIMESTAMP_EXPIRED',
      });
      return;
    }

    const body = req.method === 'GET' ? '' : JSON.stringify(req.body || {});
    const payload = `${timestamp}${req.method}${req.path}${body}`;
    
    const expectedSignature = crypto
      .createHmac('sha256', apiKeyDoc.secret)
      .update(payload)
      .digest('hex');

    if (signatureHeader !== expectedSignature) {
      res.status(401).json({
        success: false,
        error: 'Invalid signature',
        code: 'SIGNATURE_INVALID',
      });
      return;
    }
  }

  // Update last used
  await ApiKey.updateOne(
    { _id: apiKeyDoc._id },
    {
      $set: { lastUsedAt: new Date() },
      $inc: { usageCount: 1 },
    }
  );

  req.apiKey = {
    id: apiKeyDoc._id.toString(),
    merchantId: apiKeyDoc.merchantId,
    merchantName: apiKeyDoc.merchantName,
    key: apiKeyDoc.key,
    permissions: apiKeyDoc.permissions,
  };

  next();
}
