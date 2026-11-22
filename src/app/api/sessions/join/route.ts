import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { touchUserActivity } from "@/lib/touch-user-activity";
import { checkRateLimit, jsonBodyError, readJsonBody, requestIdentity } from "@/lib/api-protection";
import { joinLimiter } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let code: unknown;
  try {
    ({ code } = await readJsonBody(req, 4_000));
  } catch (error) {
    return jsonBodyError(error);
  }
  const rate = await checkRateLimit(joinLimiter, req, "/api/sessions/join", requestIdentity(req, session.user.id));
  if (rate instanceof NextResponse) return rate;

  if (!code || typeof code !== "string" || !/^[A-Z0-9]{6}$/.test(code.trim().toUpperCase())) {
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

  await touchUserActivity(session.user.id);

  // Check if already joined
  const existing = await prisma.participant.findUnique({
    where: {
      sessionId_userId: {
        sessionId: quizSession.id,
        userId: session.user.id,
      },
    },
  });

  if (existing) {
    if (existing.isFinished) {
      return NextResponse.json({
        error: "You already completed this quiz. You can view your score from your dashboard.",
        alreadyCompleted: true,
      }, { status: 409 });
    }
    return NextResponse.json({
      participant: existing,
      session: quizSession,
    });
  }

  const participantCap = Math.max(20, Number(process.env.MAX_SESSION_PARTICIPANTS || "500"));
  const participantCount = await prisma.participant.count({ where: { sessionId: quizSession.id } });
  if (participantCount >= participantCap) {
    return NextResponse.json({ error: "This session has reached its participant capacity." }, { status: 429 });
  }

  let participant;
  try {
    participant = await prisma.participant.create({
      data: {
        sessionId: quizSession.id,
        userId: session.user.id,
      },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const concurrent = await prisma.participant.findUnique({
        where: { sessionId_userId: { sessionId: quizSession.id, userId: session.user.id } },
      });
      if (concurrent) return NextResponse.json({ participant: concurrent, session: quizSession });
    }
    throw error;
  }

  // Notify teacher dashboard a new participant joined
  await pusherServer.trigger(`session-${quizSession.id}`, "participant-joined", {
    participantId: participant.id,
  });

  return NextResponse.json({
    participant,
    session: quizSession,
  }, { status: 201 });
}
