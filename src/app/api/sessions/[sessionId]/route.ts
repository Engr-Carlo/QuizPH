import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { getQuizActiveQuestionCount, selectQuestionsForSession } from "@/lib/utils";
import { NextResponse } from "next/server";

function buildTimerState(startedAt: Date | null, durationSeconds: number) {
  if (!startedAt) {
    return {
      timeLeft: durationSeconds,
      timerEndsAt: null as string | null,
    };
  }

  const timerEndsAt = new Date(startedAt.getTime() + durationSeconds * 1000);
  const timeLeft = Math.max(0, Math.ceil((timerEndsAt.getTime() - Date.now()) / 1000));

  return {
    timeLeft,
    timerEndsAt: timerEndsAt.toISOString(),
  };
}

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

  const participants = quizSession.participants.map((participant: (typeof quizSession.participants)[number]) => {
    const timerState = buildTimerState(participant.quizStartedAt, quizSession.quiz.duration);

    return {
      ...participant,
      timeLeft: participant.isFinished ? 0 : timerState.timeLeft,
      timerEndsAt: participant.isFinished ? null : timerState.timerEndsAt,
    };
  });

  // --- Quiz resume: find participant, stamp quizStartedAt on first load while ACTIVE ---
  let resumeData: { timeLeft: number; lastQuestionIndex: number; timerEndsAt: string | null } | null = null;

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

      const timerState = buildTimerState(startedAt, quizSession.quiz.duration);

      resumeData = {
        timeLeft: timerState.timeLeft,
        lastQuestionIndex: participant.lastQuestionIndex,
        timerEndsAt: timerState.timerEndsAt,
      };
    }
  }

  return NextResponse.json({
    ...quizSession,
    participants,
    quiz: {
      ...quizSession.quiz,
      activeQuestionCount,
      questions: selectedQuestions,
    },
    resumeData,
  });
}
