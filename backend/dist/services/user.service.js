import { User, Session } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createActivityLog } from './activityLog.service.js';
export async function createUser(input) {
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) {
        throw new AppError('A user with this email already exists', 409, 'USER_EXISTS');
    }
    const user = await User.create({
        email: input.email.toLowerCase(),
        password: input.password,
        name: input.name,
        role: input.role,
    });
    await createActivityLog({
        action: 'user_created',
        message: `User created: ${user.name} (${user.role})`,
        entityType: 'User',
        entityId: user._id.toString(),
    });
    return user;
}
export async function listUsers(query) {
    const filter = {};
    if (query.role)
        filter.role = query.role;
    if (query.isActive !== undefined)
        filter.isActive = query.isActive;
    if (query.search) {
        filter.$or = [
            { name: { $regex: query.search, $options: 'i' } },
            { email: { $regex: query.search, $options: 'i' } },
        ];
    }
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        User.countDocuments(filter),
    ]);
    return {
        users,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total },
    };
}
export async function getUser(id) {
    const user = await User.findById(id);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return user;
}
export async function updateUser(id, data) {
    const user = await User.findById(id);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (data.email && data.email !== user.email) {
        const existing = await User.findOne({ email: data.email.toLowerCase() });
        if (existing) {
            throw new AppError('A user with this email already exists', 409, 'USER_EXISTS');
        }
    }
    Object.assign(user, data);
    await user.save();
    await createActivityLog({
        action: 'user_updated',
        message: `User updated: ${user.name}`,
        entityType: 'User',
        entityId: user._id.toString(),
    });
    return user;
}
export async function deleteUser(id) {
    const user = await User.findById(id);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    // Cannot delete super_admin
    if (user.role === 'super_admin') {
        const superAdminCount = await User.countDocuments({ role: 'super_admin' });
        if (superAdminCount <= 1) {
            throw new AppError('Cannot delete the last super admin', 400, 'LAST_SUPER_ADMIN');
        }
    }
    await Session.updateMany({ userId: user._id }, { isActive: false });
    await User.deleteOne({ _id: user._id });
    await createActivityLog({
        action: 'user_deleted',
        message: `User deleted: ${user.name}`,
        entityType: 'User',
        entityId: id,
        severity: 'warning',
    });
    return { deleted: true };
}
export async function changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
        throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
    }
    user.password = newPassword;
    await user.save();
    await createActivityLog({
        userId,
        action: 'security_event',
        message: 'Password changed',
        entityType: 'User',
        entityId: userId,
        severity: 'warning',
    });
    return { success: true };
}
export async function listSessions(userId) {
    const sessions = await Session.find({ userId, isActive: true })
        .sort({ lastActivityAt: -1 })
        .lean();
    return sessions;
}
export async function revokeSession(sessionId, userId) {
    const session = await Session.findOneAndUpdate({ _id: sessionId, userId }, { isActive: false });
    if (!session) {
        throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }
    return { revoked: true };
}
