import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { touchUserActivity } from "@/lib/touch-user-activity";
import { getQuizActiveQuestionCount } from "@/lib/utils";
import { NextResponse } from "next/server";

function timerState(startedAt: Date | null, durationSeconds: number) {
  if (!startedAt) return { timeLeft: durationSeconds, timerEndsAt: null as string | null };
  const timerEndsAt = new Date(startedAt.getTime() + durationSeconds * 1000);
  return {
    timeLeft: Math.max(0, Math.ceil((timerEndsAt.getTime() - Date.now()) / 1000)),
    timerEndsAt: timerEndsAt.toISOString(),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const quizSession = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      code: true,
      status: true,
      quiz: {
        select: {
          id: true,
          title: true,
          duration: true,
          timerType: true,
          questionSelectionMode: true,
          questionDrawCount: true,
          teacherId: true,
          questions: { select: { id: true, order: true, includedInQuiz: true } },
        },
      },
      participants: {
        select: {
          id: true,
          score: true,
          isFinished: true,
          finishedAt: true,
          quizStartedAt: true,
          user: { select: { name: true, email: true } },
          violations: { select: { type: true, timestamp: true } },
          _count: { select: { answers: true } },
        },
        orderBy: { score: "desc" },
      },
    },
  });

  if (!quizSession || (quizSession.quiz.teacherId !== session.user.id && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await touchUserActivity(session.user.id);

  return NextResponse.json({
    id: quizSession.id,
    code: quizSession.code,
    status: quizSession.status,
    quiz: {
      title: quizSession.quiz.title,
      activeQuestionCount: getQuizActiveQuestionCount({
        questions: quizSession.quiz.questions,
        mode: quizSession.quiz.questionSelectionMode,
        drawCount: quizSession.quiz.questionDrawCount,
      }),
      questions: quizSession.quiz.questions.map((question: (typeof quizSession.quiz.questions)[number]) => ({ id: question.id, order: question.order })),
      duration: quizSession.quiz.duration,
      timerType: quizSession.quiz.timerType,
    },
    participants: quizSession.participants.map((participant: (typeof quizSession.participants)[number]) => {
      const timing = participant.isFinished
        ? { timeLeft: 0, timerEndsAt: null }
        : timerState(participant.quizStartedAt, quizSession.quiz.duration);
      return {
        id: participant.id,
        score: participant.score,
        isFinished: participant.isFinished,
        finishedAt: participant.finishedAt,
        quizStartedAt: participant.quizStartedAt,
        user: participant.user,
        violations: participant.violations,
        answerCount: participant._count.answers,
        ...timing,
      };
    }),
  });
}
