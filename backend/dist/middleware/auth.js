import jwt from 'jsonwebtoken';
import { appConfig } from '../config/app.js';
export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED',
        });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, appConfig.jwt.secret, {
            issuer: appConfig.jwt.issuer,
        });
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: 'Token has expired',
                code: 'TOKEN_EXPIRED',
            });
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: 'Invalid token',
                code: 'TOKEN_INVALID',
            });
            return;
        }
        res.status(401).json({
            success: false,
            error: 'Authentication failed',
            code: 'AUTH_FAILED',
        });
    }
}
export function optionalAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, appConfig.jwt.secret, {
            issuer: appConfig.jwt.issuer,
        });
        req.user = decoded;
    }
    catch {
        // Token invalid but we don't block the request
    }
    next();
}
