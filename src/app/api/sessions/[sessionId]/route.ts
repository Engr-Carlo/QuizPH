import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { getQuizActiveQuestionCount, selectQuestionsForSession } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const body = await req.json();
  const { status } = body;

  if (!["ACTIVE", "ENDED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const quizSession = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: { quiz: true },
  });

  if (!quizSession || quizSession.quiz.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.quizSession.update({
    where: { id: sessionId },
    data: {
      status,
      ...(status === "ACTIVE" ? { startedAt: new Date() } : {}),
      ...(status === "ENDED" ? { endedAt: new Date() } : {}),
    },
  });

  // Notify all participants via Pusher
  await pusherServer.trigger(`session-${sessionId}`, "session-status", {
    status: updated.status,
    startedAt: updated.startedAt,
    endedAt: updated.endedAt,
  });

  return NextResponse.json(updated);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  const quizSession = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      quiz: {
        include: {
          questions: {
            include: { options: true },
            orderBy: { order: "asc" },
          },
        },
      },
      participants: {
        include: {
          user: { select: { name: true, email: true } },
          violations: true,
          answers: true,
        },
        orderBy: { score: "desc" },
      },
    },
  });

  if (!quizSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const participantId = new URL(req.url).searchParams.get("participantId") || "";
  const seed = quizSession.quiz.questionSelectionMode === "RANDOM"
    && quizSession.quiz.randomQuestionScope === "PARTICIPANT"
    && participantId
      ? `${quizSession.id}:${participantId}`
      : quizSession.id;

  const selectedQuestions = selectQuestionsForSession({
    questions: quizSession.quiz.questions,
    mode: quizSession.quiz.questionSelectionMode,
    drawCount: quizSession.quiz.questionDrawCount,
    seed,
  });

  const activeQuestionCount = getQuizActiveQuestionCount({
    questions: quizSession.quiz.questions,
    mode: quizSession.quiz.questionSelectionMode,
    drawCount: quizSession.quiz.questionDrawCount,
  });

  // --- Quiz resume: find participant, stamp quizStartedAt on first load while ACTIVE ---
  let resumeData: { timeLeft: number; lastQuestionIndex: number } | null = null;

  if (participantId && quizSession.status === "ACTIVE") {
    const participant = await prisma.participant.findFirst({
      where: { id: participantId, sessionId },
    });

    if (participant && !participant.isFinished) {
      let startedAt = participant.quizStartedAt;

      // First time this student opens the quiz while session is ACTIVE — stamp the clock
      if (!startedAt) {
        const updated = await prisma.participant.update({
          where: { id: participantId },
          data: { quizStartedAt: new Date() },
        });
        startedAt = updated.quizStartedAt;
      }

      const elapsedSeconds = startedAt
        ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
        : 0;
      const timeLeft = Math.max(0, quizSession.quiz.duration - elapsedSeconds);

      resumeData = {
        timeLeft,
        lastQuestionIndex: participant.lastQuestionIndex,
      };
    }
  }

  return NextResponse.json({
    ...quizSession,
    quiz: {
      ...quizSession.quiz,
      activeQuestionCount,
      questions: selectedQuestions,
    },
    resumeData,
  });
}
