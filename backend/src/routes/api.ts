import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, requireRole } from "../middleware/rbac.js";

const router = Router();

// Example: any authenticated user
router.get("/dashboard", requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json({
    message: `Welcome, ${user.name || user.email}`,
    roles: user.roleNames,
    permissions: user.permissions,
  });
});

// Example: requires "users:read" permission
router.get(
  "/users",
  requireAuth,
  requirePermission("users:read"),
  (_req, res) => {
    res.json({ message: "User list (placeholder)", users: [] });
  }
);

// Example: requires "admin" role
router.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  (_req, res) => {
    res.json({ message: "Admin area" });
  }
);

export default router;
