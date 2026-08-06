import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { User, Session } from '../models/index.js';
import { appConfig } from '../config/app.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityLog } from './activityLog.service.js';
export async function login(input) {
    const user = await User.findOne({ email: input.email.toLowerCase() }).select('+password');
    if (!user) {
        throw new AppError('Invalid email or password', 401, 'AUTH_INVALID');
    }
    if (!user.isActive) {
        throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
    }
    const isValid = await user.comparePassword(input.password);
    if (!isValid) {
        await createActivityLog({
            userId: user._id.toString(),
            action: 'login',
            severity: 'warning',
            message: `Failed login attempt for ${user.email}`,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });
        throw new AppError('Invalid email or password', 401, 'AUTH_INVALID');
    }
    // Check concurrent sessions
    const activeSessions = await Session.countDocuments({
        userId: user._id,
        isActive: true,
    });
    if (activeSessions >= appConfig.session.maxConcurrentSessions) {
        // Deactivate oldest sessions
        const oldestSessions = await Session.find({ userId: user._id, isActive: true })
            .sort({ lastActivityAt: 1 })
            .limit(activeSessions - appConfig.session.maxConcurrentSessions + 1);
        await Session.updateMany({ _id: { $in: oldestSessions.map((s) => s._id) } }, { isActive: false });
    }
    const tokens = generateTokens(user._id.toString(), user.email, user.role, user.name);
    // Update user
    await User.updateOne({ _id: user._id }, {
        lastLoginAt: new Date(),
        lastLoginIp: input.ipAddress,
        refreshToken: tokens.refreshToken,
    });
    // Create session
    await Session.create({
        userId: user._id,
        token: tokens.refreshToken,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
    });
    await createActivityLog({
        userId: user._id.toString(),
        action: 'login',
        message: `User ${user.name} logged in`,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
    });
    const userObj = user.toJSON();
    return {
        user: userObj,
        ...tokens,
    };
}
export async function refreshAccessToken(refreshToken) {
    try {
        const decoded = jwt.verify(refreshToken, appConfig.jwt.secret, {
            issuer: appConfig.jwt.issuer,
        });
        if (!decoded.sub) {
            throw new AppError('Invalid refresh token', 401, 'TOKEN_INVALID');
        }
        const session = await Session.findOne({
            userId: decoded.sub,
            token: refreshToken,
            isActive: true,
            expiresAt: { $gt: new Date() },
        });
        if (!session) {
            throw new AppError('Session expired or revoked', 401, 'SESSION_EXPIRED');
        }
        const user = await User.findById(decoded.sub);
        if (!user || !user.isActive) {
            throw new AppError('User not found or disabled', 401, 'USER_INVALID');
        }
        const tokens = generateTokens(user._id.toString(), user.email, user.role, user.name);
        // Update session
        await Session.updateOne({ _id: session._id }, {
            token: tokens.refreshToken,
            lastActivityAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        await User.updateOne({ _id: user._id }, { refreshToken: tokens.refreshToken });
        return tokens;
    }
    catch (error) {
        if (error instanceof AppError)
            throw error;
        throw new AppError('Invalid refresh token', 401, 'TOKEN_INVALID');
    }
}
export async function logout(userId, refreshToken) {
    if (refreshToken) {
        await Session.updateOne({ userId, token: refreshToken }, { isActive: false });
    }
    else {
        await Session.updateMany({ userId, isActive: true }, { isActive: false });
    }
    await User.updateOne({ _id: userId }, { refreshToken: undefined });
    await createActivityLog({
        userId,
        action: 'logout',
        message: 'User logged out',
    });
}
export async function getCurrentUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return user;
}
function generateTokens(userId, email, role, name) {
    const payload = { sub: userId, email, role, name };
    const accessToken = jwt.sign(payload, appConfig.jwt.secret, {
        expiresIn: 86400, // 24h in seconds
        issuer: appConfig.jwt.issuer,
    });
    const refreshToken = jwt.sign({ sub: userId, type: 'refresh' }, appConfig.jwt.secret, {
        expiresIn: 604800, // 7d in seconds
        issuer: appConfig.jwt.issuer,
    });
    return { accessToken, refreshToken };
}
export async function generateApiKeySecret() {
    const key = `zip_${crypto.randomBytes(24).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');
    return { key, secret };
}
