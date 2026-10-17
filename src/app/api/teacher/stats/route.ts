import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const MONTHS = 12;
const HOUR_MS = 3_600_000;
// Asia/Manila is a fixed UTC+8 with no DST, so a constant offset is exact.
const MANILA_OFFSET_MS = 8 * HOUR_MS;
const PARTICIPANT_CAP = 20_000;

const monthLabelFormat = new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "short", year: "numeric" });

function manilaMonthIndex(date: Date) {
  const shifted = new Date(date.getTime() + MANILA_OFFSET_MS);
  return shifted.getUTCFullYear() * 12 + shifted.getUTCMonth();
}

type QuestionTotals = { count: number; points: number };
type QuizRow = { id: string; questionSelectionMode: string; questionDrawCount: number | null };
type RecentSessionRow = {
  id: string;
  code: string;
  status: string;
  createdAt: Date;
  quizId: string;
  quiz: { title: string };
  _count: { participants: number };
};
type GroupRow = { quizId: string; _count: { _all: number }; _sum: { points: number | null } };

async function questionTotalsByQuiz(where: Prisma.QuestionWhereInput) {
  const rows = (await prisma.question.groupBy({
    by: ["quizId"],
    where,
    _sum: { points: true },
    _count: { _all: true },
  })) as unknown as GroupRow[];
  return new Map<string, QuestionTotals>(rows.map((row) => [row.quizId, { count: row._count._all, points: row._sum.points ?? 0 }]));
}

function maxPointsFor(
  quiz: { questionSelectionMode: string; questionDrawCount: number | null },
  all: QuestionTotals | undefined,
  included: QuestionTotals | undefined,
) {
  if (quiz.questionSelectionMode === "ALL") return all?.points ?? 0;
  if (quiz.questionSelectionMode === "MANUAL") return included?.points ?? 0;
  if (!included || included.count === 0) return 0;
  const drawn = Math.min(quiz.questionDrawCount ?? included.count, included.count);
  return Math.round((included.points / included.count) * drawn);
}

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacherId = session.user.id;
  const ownedBy = { quiz: { teacherId } };
  const currentMonth = manilaMonthIndex(new Date());
  const firstMonth = currentMonth - (MONTHS - 1);
  // Start of the oldest bucket (Manila midnight on the 1st), used to bound the sessions query.
  const since = new Date(Date.UTC(Math.floor(firstMonth / 12), firstMonth % 12, 1) - MANILA_OFFSET_MS);

  try {
    const [quizzes, allMap, includedMap, sessionCount, liveCount, recentSessions, windowSessions, participants, violationCount] =
      await Promise.all([
        prisma.quiz.findMany({
          where: { teacherId },
          select: { id: true, questionSelectionMode: true, questionDrawCount: true },
        }),
        questionTotalsByQuiz(ownedBy),
        questionTotalsByQuiz({ ...ownedBy, includedInQuiz: true }),
        prisma.quizSession.count({ where: ownedBy }),
        prisma.quizSession.count({ where: { ...ownedBy, status: "ACTIVE" } }),
        prisma.quizSession.findMany({
          where: ownedBy,
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            code: true,
            status: true,
            createdAt: true,
            quizId: true,
            quiz: { select: { title: true } },
            _count: { select: { participants: true } },
          },
        }),
        prisma.quizSession.findMany({ where: { ...ownedBy, createdAt: { gte: since } }, select: { createdAt: true } }),
        prisma.participant.findMany({
          where: { session: ownedBy },
          select: { score: true, isFinished: true, joinedAt: true, userId: true, session: { select: { quizId: true } } },
          take: PARTICIPANT_CAP,
        }),
        prisma.violationLog.count({ where: { session: ownedBy } }),
      ]);

    const maxPoints = new Map<string, number>(
      quizzes.map((quiz: QuizRow): [string, number] => [quiz.id, maxPointsFor(quiz, allMap.get(quiz.id), includedMap.get(quiz.id))]),
    );

    const months = Array.from({ length: MONTHS }, (_, i) => {
      const index = firstMonth + i;
      return {
        label: monthLabelFormat.format(new Date(Date.UTC(Math.floor(index / 12), index % 12, 1))),
        sessions: 0,
        participants: 0,
      };
    });
    const monthBucket = (date: Date) => {
      const offset = manilaMonthIndex(date) - firstMonth;
      return offset >= 0 && offset < MONTHS ? offset : -1;
    };

    for (const row of windowSessions) {
      const index = monthBucket(row.createdAt);
      if (index >= 0) months[index].sessions += 1;
    }

    const bands = [
      { label: "90% and above", count: 0 },
      { label: "75% to 89%", count: 0 },
      { label: "60% to 74%", count: 0 },
      { label: "Below 60%", count: 0 },
    ];
    let finished = 0;
    let scoreSum = 0;
    let scored = 0;
    const students = new Set<string>();

    for (const participant of participants) {
      students.add(participant.userId);

      const index = monthBucket(participant.joinedAt);
      if (index >= 0) months[index].participants += 1;

      if (!participant.isFinished) continue;
      finished += 1;

      const max = maxPoints.get(participant.session.quizId) ?? 0;
      if (max <= 0) continue;
      const pct = Math.min(100, (participant.score / max) * 100);
      scoreSum += pct;
      scored += 1;
      bands[pct >= 90 ? 0 : pct >= 75 ? 1 : pct >= 60 ? 2 : 3].count += 1;
    }

    const questionTotal = [...allMap.values()].reduce((sum, row) => sum + row.count, 0);

    return NextResponse.json(
      {
        totals: {
          quizzes: quizzes.length,
          questions: questionTotal,
          sessions: sessionCount,
          liveSessions: liveCount,
          students: students.size,
          attempts: participants.length,
          completionRate: participants.length ? Math.round((finished / participants.length) * 100) : null,
          avgScore: scored ? Math.round(scoreSum / scored) : null,
          violations: violationCount,
        },
        months,
        scoreBands: bands,
        recentSessions: recentSessions.map((row: RecentSessionRow) => ({
          id: row.id,
          code: row.code,
          status: row.status,
          createdAt: row.createdAt,
          quizId: row.quizId,
          quizTitle: row.quiz.title,
          participants: row._count.participants,
        })),
      },
      { headers: { "Cache-Control": "private, max-age=30" } },
    );
  } catch (error) {
    console.error("Failed to load teacher stats", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
