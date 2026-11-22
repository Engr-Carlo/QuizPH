import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 29);
  const events = await prisma.rateLimitEvent.findMany({
    where: { date: { gte: since.toISOString().slice(0, 10) } },
    orderBy: [{ date: "desc" }, { count: "desc" }],
  });

  return NextResponse.json({
    mode: process.env.RATE_LIMIT_MODE === "enforce" ? "enforce" : "monitor",
    sharedBackendConfigured: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    events,
  });
}
