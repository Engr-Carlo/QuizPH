import { auth } from "@/lib/auth";
import { logCompute } from "@/lib/logCompute";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const t0 = performance.now();
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "50")));

  const where =
    statusFilter && ["WAITING", "ACTIVE", "ENDED"].includes(statusFilter)
      ? { status: statusFilter as "WAITING" | "ACTIVE" | "ENDED" }
      : {};

  const [sessions, total] = await Promise.all([
    prisma.quizSession.findMany({
      where,
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            teacher: { select: { id: true, name: true, email: true } },
          },
        },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { score: "desc" },
        },
        _count: { select: { participants: true, violations: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.quizSession.count({ where }),
  ]);

  await logCompute("/api/admin/sessions", "admin", performance.now() - t0, session.user.id);
  return NextResponse.json({ sessions, total, page, totalPages: Math.ceil(total / limit) });
}
