import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "50")));

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { teacher: { name: { contains: search, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [quizzes, total] = await Promise.all([
    prisma.quiz.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        _count: { select: { questions: true, sessions: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.quiz.count({ where }),
  ]);

  return NextResponse.json({ quizzes, total, page, totalPages: Math.ceil(total / limit) });
}
