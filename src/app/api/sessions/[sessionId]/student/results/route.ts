import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { touchUserActivity } from "@/lib/touch-user-activity";
import { getQuizActiveQuestionCount, selectQuestionsForSession } from "@/lib/utils";
import { NextResponse } from "next/server";

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
      quiz: {
        select: {
          title: true,
          questionSelectionMode: true,
          randomQuestionScope: true,
          questionDrawCount: true,
          questions: {
            select: {
              id: true,
              type: true,
              text: true,
              order: true,
              includedInQuiz: true,
              points: true,
              options: { select: { id: true, text: true, isCorrect: true } },
            },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!quizSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const participant = await prisma.participant.findFirst({
    where: { sessionId, userId: session.user.id },
    select: {
      id: true,
      score: true,
      isFinished: true,
      answers: { select: { questionId: true, answerText: true, isCorrect: true } },
    },
  });

  if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await touchUserActivity(session.user.id);

  const selectedQuestions = selectQuestionsForSession({
    questions: quizSession.quiz.questions,
    mode: quizSession.quiz.questionSelectionMode,
    drawCount: quizSession.quiz.questionDrawCount,
    seed: quizSession.quiz.questionSelectionMode === "RANDOM"
      && quizSession.quiz.randomQuestionScope === "PARTICIPANT"
      ? `${sessionId}:${participant.id}`
      : sessionId,
  });

  return NextResponse.json({
    id: quizSession.id,
    code: quizSession.code,
    quiz: {
      title: quizSession.quiz.title,
      activeQuestionCount: getQuizActiveQuestionCount({
        questions: quizSession.quiz.questions,
        mode: quizSession.quiz.questionSelectionMode,
        drawCount: quizSession.quiz.questionDrawCount,
      }),
      questions: selectedQuestions,
    },
    participants: [participant],
  });
}
