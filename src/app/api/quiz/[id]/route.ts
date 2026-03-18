import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        include: { options: true },
        orderBy: { order: "asc" },
      },
      sessions: {
        include: {
          _count: { select: { participants: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  if (quiz.teacherId !== session.user.id && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(quiz);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz || quiz.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.quiz.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      timerType: body.timerType,
      duration: body.duration,
      questionSelectionMode: body.questionSelectionMode,
      randomQuestionScope: body.questionSelectionMode === "RANDOM"
        ? body.randomQuestionScope
        : "SESSION",
      questionDrawCount: body.questionSelectionMode === "RANDOM"
        ? body.questionDrawCount ?? null
        : null,
      randomizeQuestions: body.randomizeQuestions,
      randomizeAnswers: body.randomizeAnswers,
      antiCheatEnabled: Boolean(body.antiCheatEnabled),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz || quiz.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.quiz.delete({ where: { id } });

  return NextResponse.json({ message: "Deleted" });
}
