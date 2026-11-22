import { auth } from "@/lib/auth";
import { logCompute } from "@/lib/logCompute";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { touchUserActivity } from "@/lib/touch-user-activity";
import { checkRateLimit, jsonBodyError, readJsonBody, requestIdentity } from "@/lib/api-protection";
import { submitLimiter } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const t0 = performance.now();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { participantId } = await readJsonBody(req, 4_000);
    const rate = await checkRateLimit(submitLimiter, req, "/api/answers/submit", requestIdentity(req, session.user.id));
    if (rate instanceof NextResponse) return rate;
    if (typeof participantId !== "string" || participantId.length > 100) {
      return NextResponse.json({ error: "Invalid participant" }, { status: 400 });
    }

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { user: { select: { name: true } } },
    });

    if (!participant || participant.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await touchUserActivity(session.user.id);

    // Idempotent: if already finished, return existing state without side effects
    if (participant.isFinished) {
      if (!participant.finishedAt) {
        const repaired = await prisma.participant.update({
          where: { id: participantId },
          data: { finishedAt: new Date() },
        });
        return NextResponse.json(repaired);
      }
      return NextResponse.json(participant);
    }

    const updated = await prisma.participant.update({
      where: { id: participantId },
      data: { isFinished: true, finishedAt: new Date() },
    });

    await pusherServer.trigger(
      `session-${participant.sessionId}`,
      "participant-finished",
      {
        participantId,
        participantName: participant.user.name,
        score: updated.score,
      }
    );

    await logCompute("/api/answers/submit", "session", performance.now() - t0, session.user.id);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && (error.message === "BODY_TOO_LARGE" || error.message === "INVALID_JSON")) {
      return jsonBodyError(error);
    }
    return NextResponse.json(
      { error: "Failed to submit quiz" },
      { status: 500 }
    );
  }
}
