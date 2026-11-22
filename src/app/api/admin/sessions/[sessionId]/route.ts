import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "25")));
  const where = { sessionId };
  const [participants, total] = await Promise.all([
    prisma.participant.findMany({
      where,
      select: {
        id: true,
        score: true,
        isFinished: true,
        joinedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ score: "desc" }, { joinedAt: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.participant.count({ where }),
  ]);

  return NextResponse.json({ participants, total, page, totalPages: Math.ceil(total / limit) });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const { action } = await req.json();

  if (action !== "force-end") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const quizSession = await prisma.quizSession.findUnique({ where: { id: sessionId } });
  if (!quizSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (quizSession.status === "ENDED") {
    return NextResponse.json({ error: "Session is already ended" }, { status: 400 });
  }

  const updated = await prisma.quizSession.update({
    where: { id: sessionId },
    data: { status: "ENDED", endedAt: new Date() },
  });

  await pusherServer.trigger(`session-${sessionId}`, "session-status", {
    status: "ENDED",
  });

  return NextResponse.json({ message: "Session ended", session: updated });
}
