import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQuizCode } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: quizId } = await params;

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Generate unique code
  let code = generateQuizCode();
  let attempts = 0;
  while (await prisma.quizSession.findUnique({ where: { code } })) {
    code = generateQuizCode();
    attempts++;
    if (attempts > 10) {
      return NextResponse.json(
        { error: "Failed to generate unique code" },
        { status: 500 }
      );
    }
  }

  const quizSession = await prisma.quizSession.create({
    data: {
      quizId,
      code,
      status: "WAITING",
    },
  });

  return NextResponse.json(quizSession, { status: 201 });
}
