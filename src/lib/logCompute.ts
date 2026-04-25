import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

// Set COMPUTE_LOGGING=false in Vercel env to disable without redeploying
const ENABLED = process.env.COMPUTE_LOGGING !== "false";

/**
 * Atomically upserts a daily aggregate row for a route and optionally tracks
 * which user triggered it. Uses raw SQL to support GREATEST() for peakMs.
 * Never throws — logging errors are silently swallowed so they can't break routes.
 */
export async function logCompute(
  route: string,
  category: string,
  durationMs: number,
  userId?: string,
): Promise<void> {
  if (!ENABLED) return;
  const date = new Date().toISOString().slice(0, 10); // "2026-04-25"
  const ms = Math.max(0, Math.round(durationMs));

  try {
    await prisma.$executeRaw`
      INSERT INTO "RouteLog" (id, date, route, category, count, "totalMs", "peakMs")
      VALUES (${randomUUID()}, ${date}, ${route}, ${category}, 1, ${ms}, ${ms})
      ON CONFLICT (date, route) DO UPDATE SET
        count    = "RouteLog".count + 1,
        "totalMs" = "RouteLog"."totalMs" + EXCLUDED."totalMs",
        "peakMs"  = GREATEST("RouteLog"."peakMs", EXCLUDED."peakMs")
    `;

    if (userId) {
      await prisma.$executeRaw`
        INSERT INTO "RouteLogUser" (id, date, route, "userId", count)
        VALUES (${randomUUID()}, ${date}, ${route}, ${userId}, 1)
        ON CONFLICT (date, route, "userId") DO UPDATE SET
          count = "RouteLogUser".count + 1
      `;
    }
  } catch {
    // intentionally silent — logging must never break a route
  }
}
