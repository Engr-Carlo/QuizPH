import { prisma } from "@/lib/prisma";

const TOUCH_INTERVAL_MS = 60_000;
const lastTouches = new Map<string, number>();

export async function touchUserActivity(userId: string | null | undefined) {
  if (!userId) return;

  const now = Date.now();
  const lastTouch = lastTouches.get(userId) ?? 0;
  if (now - lastTouch < TOUCH_INTERVAL_MS) return;

  lastTouches.set(userId, now);
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date(now) },
    });
  } catch {
    lastTouches.delete(userId);
  }
}
