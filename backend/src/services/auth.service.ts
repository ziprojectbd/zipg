import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { User, Session } from '../models/index.js';
import { appConfig } from '../config/app.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityLog } from './activityLog.service.js';

interface LoginInput {
  email: string;
  password: string;
  ipAddress: string;
  userAgent: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function login(input: LoginInput) {
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
    
    await Session.updateMany(
      { _id: { $in: oldestSessions.map((s) => s._id) } },
      { isActive: false }
    );
  }

  const tokens = generateTokens(user._id.toString(), user.email, user.role, user.name);

  // Update user
  await User.updateOne(
    { _id: user._id },
    {
      lastLoginAt: new Date(),
      lastLoginIp: input.ipAddress,
      refreshToken: tokens.refreshToken,
    }
  );

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

export async function refreshAccessToken(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, appConfig.jwt.secret, {
      issuer: appConfig.jwt.issuer,
    }) as jwt.JwtPayload;

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
    await Session.updateOne(
      { _id: session._id },
      {
        token: tokens.refreshToken,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    );

    await User.updateOne({ _id: user._id }, { refreshToken: tokens.refreshToken });

    return tokens;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid refresh token', 401, 'TOKEN_INVALID');
  }
}

export async function logout(userId: string, refreshToken?: string) {
  if (refreshToken) {
    await Session.updateOne(
      { userId, token: refreshToken },
      { isActive: false }
    );
  } else {
    await Session.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );
  }

  await User.updateOne({ _id: userId }, { refreshToken: undefined });

  await createActivityLog({
    userId,
    action: 'logout',
    message: 'User logged out',
  });
}

export async function getCurrentUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  return user;
}

function generateTokens(userId: string, email: string, role: string, name: string): TokenPair {
  const payload = { sub: userId, email, role, name };

  const accessToken = jwt.sign(payload, appConfig.jwt.secret, {
    expiresIn: 86400, // 24h in seconds
    issuer: appConfig.jwt.issuer,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh' },
    appConfig.jwt.secret,
    {
      expiresIn: 604800, // 7d in seconds
      issuer: appConfig.jwt.issuer,
    } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

export async function googleLogin(input: {
  credential: string;
  ipAddress: string;
  userAgent: string;
}) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new AppError('Google OAuth is not configured', 500, 'GOOGLE_NOT_CONFIGURED');
  }

  // Verify the Google ID token
  let googleUser: GoogleUserInfo;
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${input.credential}`);
    if (!response.ok) {
      throw new AppError('Invalid Google credential', 401, 'GOOGLE_INVALID');
    }
    googleUser = await response.json() as GoogleUserInfo;

    if (!googleUser.email_verified) {
      throw new AppError('Google email not verified', 401, 'GOOGLE_EMAIL_NOT_VERIFIED');
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to verify Google credential', 401, 'GOOGLE_VERIFY_FAILED');
  }

  // Find or create user
  let user = await User.findOne({ email: googleUser.email.toLowerCase() });

  if (!user) {
    // Auto-create user with operator role if it's the very first user, make them super_admin
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'super_admin' : 'operator';

    user = await User.create({
      email: googleUser.email.toLowerCase(),
      password: crypto.randomBytes(32).toString('hex'), // Random password for Google users
      name: googleUser.name,
      role,
      avatar: googleUser.picture,
    });

    await createActivityLog({
      userId: user._id.toString(),
      action: 'user_created',
      message: `User created via Google: ${user.name} (${role})`,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  }

  if (!user.isActive) {
    throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
  }

  // Update avatar if changed
  if (googleUser.picture && googleUser.picture !== user.avatar) {
    await User.updateOne({ _id: user._id }, { avatar: googleUser.picture });
    user.avatar = googleUser.picture;
  }

  // Session management
  const activeSessions = await Session.countDocuments({
    userId: user._id,
    isActive: true,
  });

  if (activeSessions >= appConfig.session.maxConcurrentSessions) {
    const oldestSessions = await Session.find({ userId: user._id, isActive: true })
      .sort({ lastActivityAt: 1 })
      .limit(activeSessions - appConfig.session.maxConcurrentSessions + 1);
    
    await Session.updateMany(
      { _id: { $in: oldestSessions.map((s) => s._id) } },
      { isActive: false }
    );
  }

  const tokens = generateTokens(user._id.toString(), user.email, user.role, user.name);

  await User.updateOne(
    { _id: user._id },
    {
      lastLoginAt: new Date(),
      lastLoginIp: input.ipAddress,
      refreshToken: tokens.refreshToken,
    }
  );

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
    message: `User ${user.name} logged in via Google`,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const userObj = user.toJSON();

  return {
    user: userObj,
    ...tokens,
  };
}

export async function generateApiKeySecret(): Promise<{ key: string; secret: string }> {
  const key = `zip_${crypto.randomBytes(24).toString('hex')}`;
  const secret = crypto.randomBytes(32).toString('hex');
  return { key, secret };
}
