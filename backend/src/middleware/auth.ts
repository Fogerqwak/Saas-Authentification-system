import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";

export interface JwtPayload {
  userId: string;
  email: string;
  twoFactorVerified?: boolean;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace("Bearer ", "") ||
    null;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    if (!decoded.twoFactorVerified && decoded.twoFactorVerified !== undefined) {
      res.status(403).json({
        error: "Two-factor authentication required",
        code: "2FA_REQUIRED",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePerms: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const roleNames = user.userRoles.map((ur) => ur.role.name);
    const permissions = user.userRoles.flatMap((ur) =>
      ur.role.rolePerms.map((rp) => rp.permission.name)
    );

    (req as any).user = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      twoFactorEnabled: user.twoFactorEnabled,
      roleNames,
      permissions: [...new Set(permissions)],
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace("Bearer ", "") ||
    null;

  if (!token) {
    next();
    return;
  }

  jwt.verify(token, config.jwt.secret, (err: unknown, decoded: unknown) => {
    if (err || !decoded) {
      next();
      return;
    }
    const payload = decoded as JwtPayload;
    void (async () => {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePerms: { include: { permission: true } },
                },
              },
            },
          },
        },
      });
      if (user) {
        const roleNames = user.userRoles.map((ur) => ur.role.name);
        const permissions = user.userRoles.flatMap((ur) =>
          ur.role.rolePerms.map((rp) => rp.permission.name)
        );
        (req as any).user = {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          twoFactorEnabled: user.twoFactorEnabled,
          roleNames,
          permissions: [...new Set(permissions)],
        };
      }
      next();
    })();
  });
}
