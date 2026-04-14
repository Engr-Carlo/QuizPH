import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getQuizActiveQuestionCount } from "@/lib/utils";

// GET /api/student/sessions — last 8 sessions the current student participated in
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const participants = await prisma.participant.findMany({
    where: { userId: session.user.id },
    take: 8,
    orderBy: { joinedAt: "desc" },
    select: {
      id: true,
      score: true,
      isFinished: true,
      joinedAt: true,
      session: {
        select: {
          id: true,
          code: true,
          status: true,
          endedAt: true,
          quiz: {
            select: {
              title: true,
              questionSelectionMode: true,
              questionDrawCount: true,
              questions: {
                select: { includedInQuiz: true },
              },
            },
          },
        },
      },
      _count: { select: { violations: true } },
    },
  });

  return NextResponse.json(
    participants.map((p: (typeof participants)[number]) => ({
      id: p.id,
      score: p.score,
      isFinished: p.isFinished,
      joinedAt: p.joinedAt,
      _count: p._count,
      session: {
        id: p.session.id,
        code: p.session.code,
        status: p.session.status,
        endedAt: p.session.endedAt,
        quiz: {
          title: p.session.quiz.title,
          activeQuestionCount: getQuizActiveQuestionCount({
            questions: p.session.quiz.questions,
            mode: p.session.quiz.questionSelectionMode as "ALL" | "RANDOM" | "MANUAL",
            drawCount: p.session.quiz.questionDrawCount,
          }),
        },
      },
    }))
  );
}
