import crypto from 'node:crypto';
import { ApiKey } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityLog } from './activityLog.service.js';
export async function createApiKey(input) {
    const key = `zip_${crypto.randomBytes(24).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');
    const apiKey = await ApiKey.create({
        key,
        secret,
        name: input.name,
        merchantId: input.merchantId,
        merchantName: input.merchantName,
        permissions: input.permissions || ['payment:create', 'payment:read'],
        expiresAt: input.expiresAt || undefined,
        ipWhitelist: input.ipWhitelist || [],
    });
    await createActivityLog({
        action: 'api_key_created',
        message: `API key created: ${input.name} for ${input.merchantName}`,
        entityType: 'ApiKey',
        entityId: apiKey._id.toString(),
    });
    return {
        id: apiKey._id,
        key: apiKey.key,
        secret,
        name: apiKey.name,
        merchantId: apiKey.merchantId,
        merchantName: apiKey.merchantName,
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
    };
}
export async function regenerateApiKey(id) {
    const apiKey = await ApiKey.findById(id).select('+secret');
    if (!apiKey) {
        throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND');
    }
    const newSecret = crypto.randomBytes(32).toString('hex');
    apiKey.secret = newSecret;
    await apiKey.save();
    await createActivityLog({
        action: 'api_key_created',
        message: `API key regenerated: ${apiKey.name}`,
        entityType: 'ApiKey',
        entityId: apiKey._id.toString(),
        severity: 'warning',
    });
    return { id: apiKey._id, key: apiKey.key, secret: newSecret };
}
export async function revokeApiKey(id) {
    const apiKey = await ApiKey.findByIdAndUpdate(id, { isRevoked: true, isActive: false, revokedAt: new Date() }, { new: true });
    if (!apiKey) {
        throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND');
    }
    await createActivityLog({
        action: 'api_key_revoked',
        message: `API key revoked: ${apiKey.name}`,
        entityType: 'ApiKey',
        entityId: apiKey._id.toString(),
        severity: 'warning',
    });
    return apiKey;
}
export async function listApiKeys(query) {
    const filter = {};
    if (query.merchantId)
        filter.merchantId = query.merchantId;
    if (query.isActive !== undefined)
        filter.isActive = query.isActive;
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const [keys, total] = await Promise.all([
        ApiKey.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        ApiKey.countDocuments(filter),
    ]);
    return {
        keys,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total },
    };
}
export async function getApiKey(id) {
    const apiKey = await ApiKey.findById(id);
    if (!apiKey) {
        throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND');
    }
    return apiKey;
}
