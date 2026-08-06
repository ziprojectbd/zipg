import { Request, Response, NextFunction } from 'express';

type Role = 'super_admin' | 'admin' | 'operator';

const ROLE_HIERARCHY: Record<Role, number> = {
  super_admin: 3,
  admin: 2,
  operator: 1,
};

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const userRole = req.user.role as Role;
    
    if (!userRole || !ROLE_HIERARCHY[userRole]) {
      res.status(403).json({
        success: false,
        error: 'Invalid user role',
        code: 'INVALID_ROLE',
      });
      return;
    }

    const hasPermission = allowedRoles.some(
      (role) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role]
    );

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

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRole('super_admin')(req, res, next);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRole('admin')(req, res, next);
}
