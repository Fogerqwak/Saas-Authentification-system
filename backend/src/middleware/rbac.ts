import type { Request, Response, NextFunction } from "express";

type Permission = string | string[];

/**
 * Require at least one of the given permissions.
 * Use after requireAuth.
 */
export function requirePermission(permission: Permission) {
  const permissions = Array.isArray(permission) ? permission : [permission];
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const userPerms = (user.permissions as string[]) || [];
    const hasPermission = permissions.some((p) => userPerms.includes(p));
    if (!hasPermission) {
      res.status(403).json({
        error: "Insufficient permissions",
        required: permissions,
      });
      return;
    }
    next();
  };
}

/**
 * Require at least one of the given roles.
 */
export function requireRole(role: string | string[]) {
  const roles = Array.isArray(role) ? role : [role];
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const userRoles = (user.roleNames as string[]) || [];
    const hasRole = roles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      res.status(403).json({
        error: "Insufficient role",
        required: roles,
      });
      return;
    }
    next();
  };
}
