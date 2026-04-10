import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "50")));

  const where = sessionId ? { sessionId } : {};

  const [violations, total] = await Promise.all([
    prisma.violationLog.findMany({
      where,
      include: {
        participant: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        session: {
          include: {
            quiz: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.violationLog.count({ where }),
  ]);

  // Group by session for the summary view
  type SessionSummary = {
    sessionId: string;
    sessionCode: string;
    quizTitle: string;
    totalViolations: number;
    participants: Map<string, { name: string; email: string; violations: { type: string; count: number; timestamp: string }[] }>;
  };

  const bySession = new Map<string, SessionSummary>();

  for (const v of violations) {
    const sid = v.sessionId;
    if (!bySession.has(sid)) {
      bySession.set(sid, {
        sessionId: sid,
        sessionCode: v.session.code,
        quizTitle: v.session.quiz.title,
        totalViolations: 0,
        participants: new Map(),
      });
    }
    const entry = bySession.get(sid)!;
    entry.totalViolations += v.count;

    const uid = v.participant.userId;
    if (!entry.participants.has(uid)) {
      entry.participants.set(uid, {
        name: v.participant.user.name,
        email: v.participant.user.email,
        violations: [],
      });
    }
    entry.participants.get(uid)!.violations.push({
      type: v.type,
      count: v.count,
      timestamp: v.timestamp.toISOString(),
    });
  }

  const sessionSummaries = Array.from(bySession.values()).map((s) => ({
    ...s,
    participants: Array.from(s.participants.values()),
  }));

  return NextResponse.json({ sessionSummaries, total, page, totalPages: Math.ceil(total / limit) });
}
