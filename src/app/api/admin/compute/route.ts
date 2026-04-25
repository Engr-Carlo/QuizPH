import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const since = new Date();
  since.setDate(since.getDate() - 6);
  const sinceStr = since.toISOString().slice(0, 10);

  const [logs, userLogs] = await Promise.all([
    prisma.routeLog.findMany({
      where: { date: { gte: sinceStr } },
      orderBy: [{ date: "desc" }, { totalMs: "desc" }],
    }),
    prisma.routeLogUser.findMany({
      where: { date: today },
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { count: "desc" },
      take: 20,
    }),
  ]);

  const todayLogs = logs.filter((l) => l.date === today);
  const totalCallsToday = todayLogs.reduce((s, l) => s + l.count, 0);
  const totalMsToday = todayLogs.reduce((s, l) => s + l.totalMs, 0);

  // Category breakdown for today
  const categories: Record<string, { calls: number; totalMs: number }> = {};
  for (const log of todayLogs) {
    if (!categories[log.category]) categories[log.category] = { calls: 0, totalMs: 0 };
    categories[log.category].calls += log.count;
    categories[log.category].totalMs += log.totalMs;
  }

  // 7-day trend: total ms per day
  const byDate: Record<string, { totalMs: number; calls: number }> = {};
  for (const log of logs) {
    if (!byDate[log.date]) byDate[log.date] = { totalMs: 0, calls: 0 };
    byDate[log.date].totalMs += log.totalMs;
    byDate[log.date].calls += log.count;
  }
  const trend = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // Top contributors (who triggered the most calls today by total ms)
  const topContributors = userLogs.map((u) => ({
    userId: u.userId,
    name: u.user.name,
    email: u.user.email,
    role: u.user.role,
    route: u.route,
    calls: u.count,
  }));

  return NextResponse.json({
    today: {
      date: today,
      totalCalls: totalCallsToday,
      totalMs: totalMsToday,
      routes: todayLogs.map((l) => ({
        route: l.route,
        category: l.category,
        calls: l.count,
        totalMs: l.totalMs,
        avgMs: l.count > 0 ? Math.round(l.totalMs / l.count) : 0,
        peakMs: l.peakMs,
      })),
    },
    categories,
    topContributors,
    trend,
  });
}
