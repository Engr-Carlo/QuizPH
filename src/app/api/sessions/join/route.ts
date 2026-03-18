import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await req.json();

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const quizSession = await prisma.quizSession.findUnique({
    where: { code: code.toUpperCase() },
    include: { quiz: { select: { title: true } } },
  });

  if (!quizSession) {
    return NextResponse.json({ error: "Invalid quiz code" }, { status: 404 });
  }

  if (quizSession.status === "ENDED") {
    return NextResponse.json({ error: "This quiz has already ended" }, { status: 400 });
  }

  // Check if already joined
  const existing = await prisma.participant.findFirst({
    where: {
      sessionId: quizSession.id,
      userId: session.user.id,
    },
  });

  if (existing) {
    return NextResponse.json({
      participant: existing,
      session: quizSession,
    });
  }

  const participant = await prisma.participant.create({
    data: {
      sessionId: quizSession.id,
      userId: session.user.id,
    },
  });

  // Notify teacher dashboard a new participant joined
  await pusherServer.trigger(`session-${quizSession.id}`, "participant-joined", {
    participantId: participant.id,
    name: session.user.name,
    joinedAt: participant.joinedAt,
  });

  return NextResponse.json({
    participant,
    session: quizSession,
  }, { status: 201 });
}
