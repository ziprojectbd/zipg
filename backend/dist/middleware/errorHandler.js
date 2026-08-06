import mongoose from 'mongoose';
import { appConfig } from '../config/app.js';
export class AppError extends Error {
    statusCode;
    code;
    isOperational;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
export function errorHandler(err, req, res, _next) {
    // Default error
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details = undefined;
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        code = err.code;
        message = err.message;
    }
    else if (err instanceof mongoose.Error.ValidationError) {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = 'Database validation failed';
        details = Object.values(err.errors).map((e) => ({
            field: e.path,
            message: e.message,
        }));
    }
    else if (err instanceof mongoose.Error.CastError) {
        statusCode = 400;
        code = 'INVALID_ID';
        message = 'Invalid resource identifier';
    }
    else if (err.code === 11000) {
        statusCode = 409;
        code = 'DUPLICATE_ENTRY';
        message = 'A record with this value already exists';
    }
    else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        statusCode = 401;
        code = 'AUTH_FAILED';
        message = 'Authentication failed';
    }
    // Log error
    if (statusCode >= 500) {
        console.error(`[zi-pay] ERROR ${code}:`, {
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
            ip: req.ip,
        });
    }
    const response = {
        success: false,
        error: message,
        code,
    };
    if (details) {
        response.details = details;
    }
    if (!appConfig.isProduction && statusCode >= 500) {
        response.stack = err.stack;
    }
    res.status(statusCode).json(response);
}
export function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.path}`,
        code: 'NOT_FOUND',
    });
}
