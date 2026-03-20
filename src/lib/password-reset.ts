import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";

const TOKEN_TTL_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;

function getSecret() {
  return process.env.EMAIL_VERIFICATION_SECRET || process.env.AUTH_SECRET || "dev-secret";
}

function hashToken(token: string) {
  return createHash("sha256")
    .update(`${token}:${getSecret()}`)
    .digest("hex");
}

export async function createAndSendResetToken(user: {
  id: string;
  email: string;
  name: string;
}) {
  const latest = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (latest) {
    const elapsed = (Date.now() - latest.createdAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      return { sent: false, waitForSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed) };
    }
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  const created = await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

  const subject = "QuizPH Password Reset";
  const text = `Hi ${user.name}, reset your password using this link: ${resetUrl}. It expires in ${TOKEN_TTL_MINUTES} minutes.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px;">Reset your QuizPH password</h2>
      <p style="margin:0 0 12px;">Hi ${user.name},</p>
      <p style="margin:0 0 16px;">Click the button below to reset your password:</p>
      <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;">Reset Password</a>
      <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">This link expires in ${TOKEN_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `;

  const result = await sendMail({ to: user.email, subject, text, html });

  if (!result.delivered && !result.previewMode) {
    await prisma.passwordResetToken.delete({ where: { id: created.id } });
    return { sent: false, error: result.error || "Reset email could not be sent" };
  }

  // Invalidate older unused tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, consumedAt: null, id: { not: created.id } },
    data: { consumedAt: new Date() },
  });

  return {
    sent: result.delivered || Boolean(result.previewMode),
    previewToken: process.env.NODE_ENV !== "production" ? token : undefined,
  };
}

export async function verifyResetToken(email: string, token: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return { ok: false, error: "Invalid or expired reset link" };

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      tokenHash,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, error: "Invalid or expired reset link" };

  return { ok: true, userId: user.id, tokenId: record.id };
}

export async function consumeResetToken(tokenId: string) {
  await prisma.passwordResetToken.update({
    where: { id: tokenId },
    data: { consumedAt: new Date() },
  });
}
