import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { touchUserActivity } from "@/lib/touch-user-activity";
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
      status: true,
      quiz: { select: { duration: true } },
      participants: {
        where: { userId: session.user.id },
        select: {
          score: true,
          isFinished: true,
          lastQuestionIndex: true,
          quizStartedAt: true,
        },
        take: 1,
      },
    },
  });
  const participant = quizSession?.participants[0];

  if (!quizSession || !participant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await touchUserActivity(session.user.id);

  let timeLeft = participant.isFinished ? 0 : quizSession.quiz.duration;
  let timerEndsAt: string | null = null;
  if (!participant.isFinished && participant.quizStartedAt) {
    const endsAt = new Date(participant.quizStartedAt.getTime() + quizSession.quiz.duration * 1000);
    timeLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 1000));
    timerEndsAt = endsAt.toISOString();
  }

  return NextResponse.json({
    id: quizSession.id,
    status: quizSession.status,
    resumeData: {
      timeLeft,
      lastQuestionIndex: participant.lastQuestionIndex,
      timerEndsAt,
      isFinished: participant.isFinished,
      alreadyCompleted: participant.isFinished,
      score: participant.isFinished ? participant.score : null,
    },
  });
}
