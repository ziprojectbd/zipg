const ROLE_HIERARCHY = {
    super_admin: 3,
    admin: 2,
    operator: 1,
};
export function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED',
            });
            return;
        }
        const userRole = req.user.role;
        if (!userRole || !ROLE_HIERARCHY[userRole]) {
            res.status(403).json({
                success: false,
                error: 'Invalid user role',
                code: 'INVALID_ROLE',
            });
            return;
        }
        const hasPermission = allowedRoles.some((role) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role]);
        if (!hasPermission) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'FORBIDDEN',
            });
            return;
        }
        next();
    };
}
export function requireSuperAdmin(req, res, next) {
    return requireRole('super_admin')(req, res, next);
}
export function requireAdmin(req, res, next) {
    return requireRole('admin')(req, res, next);
}
