import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { touchUserActivity } from "@/lib/touch-user-activity";
import { getQuizActiveQuestionCount, selectQuestionsForSession } from "@/lib/utils";
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
  if (!session?.user?.id) {
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
          title: true,
          duration: true,
          timerType: true,
          questionSelectionMode: true,
          randomQuestionScope: true,
          questionDrawCount: true,
          randomizeQuestions: true,
          randomizeAnswers: true,
          antiCheatEnabled: true,
          allowSkip: true,
          questions: {
            select: {
              id: true,
              type: true,
              topic: true,
              text: true,
              order: true,
              includedInQuiz: true,
              points: true,
              mathTolerance: true,
              options: { select: { id: true, text: true } },
            },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!quizSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const participant = await prisma.participant.findFirst({
    where: { sessionId, userId: session.user.id },
    select: {
      id: true,
      score: true,
      isFinished: true,
      lastQuestionIndex: true,
      quizStartedAt: true,
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await touchUserActivity(session.user.id);

  let startedAt = participant.quizStartedAt;
  if (quizSession.status === "ACTIVE" && !participant.isFinished && !startedAt) {
    const updated = await prisma.participant.update({
      where: { id: participant.id },
      data: { quizStartedAt: new Date() },
      select: { quizStartedAt: true },
    });
    startedAt = updated.quizStartedAt;
  }

  const selectedQuestions = selectQuestionsForSession({
    questions: quizSession.quiz.questions,
    mode: quizSession.quiz.questionSelectionMode,
    drawCount: quizSession.quiz.questionDrawCount,
    seed: quizSession.quiz.questionSelectionMode === "RANDOM"
      && quizSession.quiz.randomQuestionScope === "PARTICIPANT"
      ? `${sessionId}:${participant.id}`
      : sessionId,
  });

  const timing = quizSession.status === "ACTIVE"
    ? timerState(startedAt, quizSession.quiz.duration)
    : { timeLeft: participant.isFinished ? 0 : quizSession.quiz.duration, timerEndsAt: null };

  return NextResponse.json({
    id: quizSession.id,
    code: quizSession.code,
    status: quizSession.status,
    quiz: {
      title: quizSession.quiz.title,
      duration: quizSession.quiz.duration,
      timerType: quizSession.quiz.timerType,
      activeQuestionCount: getQuizActiveQuestionCount({
        questions: quizSession.quiz.questions,
        mode: quizSession.quiz.questionSelectionMode,
        drawCount: quizSession.quiz.questionDrawCount,
      }),
      randomizeQuestions: quizSession.quiz.randomizeQuestions,
      randomizeAnswers: quizSession.quiz.randomizeAnswers,
      antiCheatEnabled: quizSession.quiz.antiCheatEnabled,
      allowSkip: quizSession.quiz.allowSkip,
      questions: selectedQuestions,
    },
    resumeData: {
      ...timing,
      lastQuestionIndex: participant.lastQuestionIndex,
      isFinished: participant.isFinished,
      alreadyCompleted: participant.isFinished,
      score: participant.isFinished ? participant.score : null,
    },
  });
}
