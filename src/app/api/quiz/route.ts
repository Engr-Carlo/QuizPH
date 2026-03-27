import { auth } from "@/lib/auth";
import { listQuizzesWithLegacyFallback } from "@/lib/legacy-quiz-api";
import { prisma } from "@/lib/prisma";
import { quizSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const rawLimit = Number(url.searchParams.get("limit") || "0");
  const limit = rawLimit > 0 ? Math.min(100, rawLimit) : 0;
  const paginated = limit > 0;

  try {
    const baseQuery = { where: { teacherId: session.user.id }, include: { _count: { select: { questions: true, sessions: true } } }, orderBy: { createdAt: "desc" } } as const;

    if (paginated) {
      const [quizzes, total] = await Promise.all([
        prisma.quiz.findMany({ ...baseQuery, skip: (page - 1) * limit, take: limit }),
        prisma.quiz.count({ where: { teacherId: session.user.id } }),
      ]);
      return NextResponse.json({ quizzes, total, page, totalPages: Math.ceil(total / limit) });
    }

    const quizzes = await prisma.quiz.findMany(baseQuery);
    return NextResponse.json(quizzes);
  } catch (error) {
    console.error("Failed to load quizzes via Prisma, trying legacy fallback", error);

    try {
      const quizzes = await listQuizzesWithLegacyFallback(session.user.id);
      return NextResponse.json(quizzes);
    } catch (fallbackError) {
      console.error("Legacy quiz fallback failed", fallbackError);
      return NextResponse.json(
        { error: "Failed to load quizzes" },
        { status: 500 }
      );
    }
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = quizSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const quiz = await prisma.quiz.create({
      data: {
        ...parsed.data,
        questionDrawCount: parsed.data.questionSelectionMode === "RANDOM"
          ? parsed.data.questionDrawCount ?? null
          : null,
        randomQuestionScope: parsed.data.questionSelectionMode === "RANDOM"
          ? parsed.data.randomQuestionScope
          : "SESSION",
        teacherId: session.user.id,
      },
    });

    return NextResponse.json(quiz, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create quiz" },
      { status: 500 }
    );
  }
}
