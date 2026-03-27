import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";

const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

function getVerificationSecret() {
  return process.env.EMAIL_VERIFICATION_SECRET || process.env.AUTH_SECRET || "dev-secret";
}

function hashCode(email: string, code: string) {
  return createHash("sha256")
    .update(`${email.toLowerCase()}:${code}:${getVerificationSecret()}`)
    .digest("hex");
}

function generateCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function createAndSendVerificationCode(user: {
  id: string;
  email: string;
  name: string;
}) {
  const latest = await prisma.emailVerificationCode.findFirst({
    where: {
      userId: user.id,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (latest) {
    const elapsedSeconds = (Date.now() - latest.createdAt.getTime()) / 1000;
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const waitFor = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds);
      return { sent: false, waitForSeconds: waitFor };
    }
  }

  const code = generateCode();
  const codeHash = hashCode(user.email, code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  const createdCode = await prisma.emailVerificationCode.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt,
    },
  });

  const subject = "QuizPH Email Verification Code";
  const text = `Hi ${user.name}, your QuizPH verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px;">Verify your QuizPH account</h2>
      <p style="margin:0 0 12px;">Hi ${user.name},</p>
      <p style="margin:0 0 16px;">Use this verification code to activate your account:</p>
      <div style="font-size:28px;letter-spacing:8px;font-weight:700;background:#eef2ff;color:#312e81;padding:14px 16px;border-radius:10px;display:inline-block;">${code}</div>
      <p style="margin:16px 0 0;">This code expires in ${CODE_TTL_MINUTES} minutes.</p>
      <p style="margin:16px 0 0;color:#6b7280;font-size:13px;">If you did not create this account, you can ignore this email.</p>
    </div>
  `;

  const result = await sendMail({
    to: user.email,
    subject,
    text,
    html,
  });

  if (!result.delivered && !result.previewMode) {
    await prisma.emailVerificationCode.delete({
      where: { id: createdCode.id },
    });

    return {
      sent: false,
      error: result.error || "Verification email could not be sent",
    };
  }

  await prisma.emailVerificationCode.updateMany({
    where: {
      userId: user.id,
      consumedAt: null,
      id: { not: createdCode.id },
    },
    data: {
      consumedAt: new Date(),
    },
  });

  return {
    sent: result.delivered || Boolean(result.previewMode),
    error: result.error,
    previewCode: process.env.NODE_ENV !== "production" ? code : undefined,
  };
}

export async function verifyEmailCode(email: string, code: string) {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return { ok: false, error: "Invalid verification code" };
  }

  if (user.emailVerifiedAt) {
    return { ok: true, alreadyVerified: true };
  }

  const codeHash = hashCode(normalizedEmail, code);

  const record = await prisma.emailVerificationCode.findFirst({
    where: {
      userId: user.id,
      codeHash,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { ok: false, error: "Invalid or expired verification code" };
  }

  await prisma.$transaction([
    prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationCode.updateMany({
      where: {
        userId: user.id,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    }),
  ]);

  return { ok: true, alreadyVerified: false };
}
