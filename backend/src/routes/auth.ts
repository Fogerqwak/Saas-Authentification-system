import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../auth/jwt.js";
import {
  generateSecret,
  generateOtpAuthUrl,
  generateQrCodeDataUrl,
  verifyToken as verifyTOTP,
  enableTwoFactor,
  disableTwoFactor,
} from "../auth/twoFactor.js";
import { requireAuth } from "../middleware/auth.js";
import { config } from "../config.js";

const router = Router();

// ----- Local auth -----
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name: name || null,
        provider: "local",
      },
    });
    const userRole = await prisma.role.findUnique({ where: { name: "user" } });
    if (userRole) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: userRole.id },
      });
    }
    const token = signToken(user.id, user.email, {
      twoFactorVerified: !user.twoFactorEnabled,
    });
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(201)
      .json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          twoFactorEnabled: user.twoFactorEnabled,
        },
        token,
        requiresTwoFactor: user.twoFactorEnabled,
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post(
  "/login",
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "local",
      { session: false },
      (err: Error | null, user: any, info: { message?: string }) => {
        if (err) return next(err);
        if (!user) {
          res.status(401).json({ error: info?.message || "Invalid credentials" });
          return;
        }
        (req as any).loginUser = user;
        next();
      }
    )(req, res, next);
  },
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).loginUser;
    const token = signToken(user.id, user.email, {
      twoFactorVerified: !user.twoFactorEnabled,
    });
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          twoFactorEnabled: user.twoFactorEnabled,
        },
        token,
        requiresTwoFactor: user.twoFactorEnabled,
      });
  }
);

// ----- OAuth -----
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${config.clientUrl}/login` }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = signToken(user.id, user.email, {
      twoFactorVerified: !user.twoFactorEnabled,
    });
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .redirect(`${config.clientUrl}/auth/callback?token=${token}`);
  }
);

router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"], session: false })
);

router.get(
  "/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: `${config.clientUrl}/login` }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = signToken(user.id, user.email, {
      twoFactorVerified: !user.twoFactorEnabled,
    });
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .redirect(`${config.clientUrl}/auth/callback?token=${token}`);
  }
);

// ----- 2FA -----
router.post(
  "/2fa/setup",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!dbUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (dbUser.twoFactorEnabled) {
      res.status(400).json({ error: "2FA already enabled" });
      return;
    }
    const secret = generateSecret(dbUser.email);
    const otpAuthUrl = generateOtpAuthUrl(dbUser.email, secret);
    const qrDataUrl = await generateQrCodeDataUrl(otpAuthUrl);
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret },
    });
    res.json({
      secret,
      qrCode: qrDataUrl,
      message: "Scan with authenticator app, then verify with a code",
    });
  }
);

router.post(
  "/2fa/verify",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { code } = req.body as { code?: string };
    if (!code) {
      res.status(400).json({ error: "Code required" });
      return;
    }
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!dbUser?.twoFactorSecret) {
      res.status(400).json({ error: "2FA not set up" });
      return;
    }
    const valid = verifyTOTP(dbUser.twoFactorSecret, code);
    if (!valid) {
      res.status(400).json({ error: "Invalid code" });
      return;
    }
    await enableTwoFactor(user.id, dbUser.twoFactorSecret);
    const token = signToken(user.id, user.email, { twoFactorVerified: true });
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        verified: true,
        token,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          avatar: dbUser.avatar,
          twoFactorEnabled: true,
        },
      });
  }
);

router.post(
  "/2fa/disable",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { code } = req.body as { code?: string };
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!dbUser?.twoFactorEnabled) {
      res.status(400).json({ error: "2FA not enabled" });
      return;
    }
    if (!dbUser.twoFactorSecret || !code) {
      res.status(400).json({ error: "Code required" });
      return;
    }
    const valid = verifyTOTP(dbUser.twoFactorSecret, code);
    if (!valid) {
      res.status(400).json({ error: "Invalid code" });
      return;
    }
    await disableTwoFactor(user.id);
    res.json({ disabled: true });
  }
);

router.post("/2fa/login", async (req: Request, res: Response): Promise<void> => {
  const { token: tempToken, code } = req.body as { token?: string; code?: string };
  if (!tempToken || !code) {
    res.status(400).json({ error: "Token and code required" });
    return;
  }
  let decoded: { userId?: string; email?: string };
  try {
    decoded = jwt.verify(tempToken, config.jwt.secret) as any;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });
  if (!user?.twoFactorSecret) {
    res.status(400).json({ error: "2FA not enabled" });
    return;
  }
  const valid = verifyTOTP(user.twoFactorSecret, code);
  if (!valid) {
    res.status(400).json({ error: "Invalid code" });
    return;
  }
  const newToken = signToken(user.id, user.email, { twoFactorVerified: true });
  res
    .cookie("token", newToken, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json({
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        twoFactorEnabled: true,
      },
    });
});

// ----- Me & logout -----
router.get("/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  res.json({ user: (req as any).user });
});

router.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("token").json({ ok: true });
});

export default router;
