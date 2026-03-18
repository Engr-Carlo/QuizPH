import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { selectQuestionsForSession } from "@/lib/utils";
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
  _req: Request,
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

  const selectedQuestions = selectQuestionsForSession({
    questions: quizSession.quiz.questions,
    mode: quizSession.quiz.questionSelectionMode,
    drawCount: quizSession.quiz.questionDrawCount,
    seed: quizSession.id,
  });

  return NextResponse.json({
    ...quizSession,
    quiz: {
      ...quizSession.quiz,
      questions: selectedQuestions,
    },
  });
}
