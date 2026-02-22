import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { JwtPayload } from "../middleware/auth.js";

export function signToken(
  userId: string,
  email: string,
  options?: { twoFactorVerified?: boolean }
): string {
  const payload: JwtPayload = {
    userId,
    email,
    twoFactorVerified: options?.twoFactorVerified ?? true,
  };
  return jwt.sign(
    payload,
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
  );
}
