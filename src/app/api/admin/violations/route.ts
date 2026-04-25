import { auth } from "@/lib/auth";
import { logCompute } from "@/lib/logCompute";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const t0 = performance.now();
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId") ?? "";
  const typeFilter = url.searchParams.get("type") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "50")));

  const where: Record<string, unknown> = {};
  if (sessionId) where.sessionId = sessionId;
  if (typeFilter) where.type = typeFilter;

  const [violations, total] = await Promise.all([
    prisma.violationLog.findMany({
      where,
      select: {
        id: true, type: true, count: true, note: true, timestamp: true,
        participantId: true, sessionId: true,
        participant: { select: { user: { select: { name: true, email: true } } } },
        session: { select: { code: true, quiz: { select: { title: true } } } },
      },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.violationLog.count({ where }),
  ]);

  type ParticipantEntry = {
    participantId: string;
    name: string;
    email: string;
    note: string | null;
    violations: { type: string; count: number; timestamp: string }[];
  };

  type SessionSummary = {
    sessionId: string;
    sessionCode: string;
    quizTitle: string;
    totalViolations: number;
    participants: Map<string, ParticipantEntry>;
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

    const pid = v.participantId;
    if (!entry.participants.has(pid)) {
      entry.participants.set(pid, {
        participantId: pid,
        name: v.participant.user.name,
        email: v.participant.user.email,
        note: v.note ?? null,
        violations: [],
      });
    }
    const p = entry.participants.get(pid)!;
    // Keep the first non-null note found (most recent first due to orderBy)
    if (v.note && !p.note) p.note = v.note;
    p.violations.push({ type: v.type, count: v.count, timestamp: v.timestamp.toISOString() });
  }

  const sessionSummaries = Array.from(bySession.values()).map((s) => ({
    ...s,
    participants: Array.from(s.participants.values()),
  }));

  await logCompute("/api/admin/violations", "admin", performance.now() - t0, session.user.id);
  return NextResponse.json({ sessionSummaries, total, page, totalPages: Math.ceil(total / limit) });
}

// PATCH: save an admin note on all violation logs for a participant
// Uses @@index([participantId]) on ViolationLog — fast update
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { participantId, note } = await req.json();
  if (!participantId) {
    return NextResponse.json({ error: "participantId required" }, { status: 400 });
  }

  await prisma.violationLog.updateMany({
    where: { participantId },
    data: { note: String(note ?? "").trim() || null },
  });

  return NextResponse.json({ ok: true });
}

