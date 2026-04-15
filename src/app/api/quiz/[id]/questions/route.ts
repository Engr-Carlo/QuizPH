import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: quizId } = await params;
  const body = await req.json();

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const questionCount = await prisma.question.count({ where: { quizId } });

  const question = await prisma.question.create({
    data: {
      quizId,
      type: body.type,
      topic: body.topic ?? "General",
      text: body.text,
      order: body.order ?? questionCount,
      includedInQuiz: body.includedInQuiz ?? true,
      mathTolerance: body.type === "MATH" ? (body.mathTolerance ?? 0) : 0,
      options: {
        create: body.options?.map((opt: { text: string; isCorrect: boolean }) => ({
          text: opt.text,
          isCorrect: opt.isCorrect,
        })) ?? [],
      },
    },
    include: { options: true },
  });

  return NextResponse.json(question, { status: 201 });
}
