import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { quizId } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      title: true,
      timerType: true,
      duration: true,
      antiCheatEnabled: true,
      randomizeQuestions: true,
      randomizeAnswers: true,
      allowSkip: true,
      questionSelectionMode: true,
      questions: {
        where: { includedInQuiz: true },
        select: {
          id: true, text: true, type: true, order: true,
          options: { select: { id: true, text: true, isCorrect: true } },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  return NextResponse.json(quiz);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { quizId } = await params;

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  await prisma.quiz.delete({ where: { id: quizId } });

  return NextResponse.json({ message: "Quiz deleted" });
}
