import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const AUTH_RECORD_RETENTION_DAYS = 30;
const COMPUTE_LOG_RETENTION_DAYS = 90;

export async function runDataRetention(now = new Date()) {
  const authCutoff = new Date(now.getTime() - AUTH_RECORD_RETENTION_DAYS * DAY_MS);
  const computeCutoff = new Date(now.getTime() - COMPUTE_LOG_RETENTION_DAYS * DAY_MS)
    .toISOString()
    .slice(0, 10);

  const [verificationCodes, passwordTokens, routeLogUsers, routeLogs, rateLimitEvents] = await prisma.$transaction([
    prisma.emailVerificationCode.deleteMany({
      where: {
        OR: [
          { consumedAt: { not: null, lt: authCutoff } },
          { expiresAt: { lt: authCutoff } },
        ],
      },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { consumedAt: { not: null, lt: authCutoff } },
          { expiresAt: { lt: authCutoff } },
        ],
      },
    }),
    prisma.routeLogUser.deleteMany({ where: { date: { lt: computeCutoff } } }),
    prisma.routeLog.deleteMany({ where: { date: { lt: computeCutoff } } }),
    prisma.rateLimitEvent.deleteMany({ where: { date: { lt: computeCutoff } } }),
  ]);

  return {
    verificationCodes: verificationCodes.count,
    passwordResetTokens: passwordTokens.count,
    routeLogUsers: routeLogUsers.count,
    routeLogs: routeLogs.count,
    rateLimitEvents: rateLimitEvents.count,
  };
}
