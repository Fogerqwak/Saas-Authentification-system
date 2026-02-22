import { authenticator } from "otplib";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma.js";

export function generateSecret(email: string): string {
  return authenticator.generateSecret();
}

export function generateOtpAuthUrl(
  email: string,
  secret: string,
  appName: string = "SaaS Auth"
): string {
  return authenticator.keyuri(email, appName, secret);
}

export async function generateQrCodeDataUrl(otpAuthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUrl);
}

export function verifyToken(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

export async function enableTwoFactor(userId: string, secret: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret, twoFactorEnabled: true },
  });
}

export async function disableTwoFactor(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: null, twoFactorEnabled: false },
  });
}
