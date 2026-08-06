import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import * as userService from '../services/user.service.js';

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const result = await authService.login({ email, password, ipAddress, userAgent });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshTokenController(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'Refresh token is required', code: 'TOKEN_REQUIRED' });
      return;
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const { refreshToken } = req.body;

    await authService.logout(userId, refreshToken);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function meController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const user = await authService.getCurrentUser(userId);

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

export async function changePasswordController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const { currentPassword, newPassword } = req.body;

    const result = await userService.changePassword(userId, currentPassword, newPassword);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function listSessionsController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const sessions = await userService.listSessions(userId);

    res.json({
      success: true,
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
}

export async function revokeSessionController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const { sessionId } = req.params;

    const result = await userService.revokeSession(String(sessionId), userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function googleLoginController(req: Request, res: Response, next: NextFunction) {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({ success: false, error: 'Google credential is required', code: 'CREDENTIAL_REQUIRED' });
      return;
    }

    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const result = await authService.googleLogin({ credential, ipAddress, userAgent });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
