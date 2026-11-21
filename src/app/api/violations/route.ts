import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { RateLimiter } from "@/lib/rate-limit";
import { violationBatchSchema } from "@/lib/validations";
import { touchUserActivity } from "@/lib/touch-user-activity";
import { NextResponse } from "next/server";

// In-memory guard: spam is dropped before any DB work (best-effort per instance).
const violationLimiter = new RateLimiter(20, 60_000);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const raw = await req.json();
    // Accept the legacy single `type` payload from clients cached before batching shipped.
    const input = raw && !raw.types && raw.type ? { ...raw, types: [raw.type] } : raw;
    const parsed = violationBatchSchema.safeParse(input);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { participantId, types } = parsed.data;

    if (!violationLimiter.hit(participantId).allowed) {
      return NextResponse.json({ message: "ok" }, { status: 200 });
    }

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      select: { userId: true, sessionId: true, user: { select: { name: true } } },
    });

    if (!participant || participant.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await touchUserActivity(session.user.id);

    // Trust the participant's real session, not the client-supplied one.
    const sessionId = participant.sessionId;
    const timestamp = new Date();

    await prisma.violationLog.createMany({
      data: types.map((type) => ({ participantId, sessionId, type, timestamp })),
    });

    const totalCount = await prisma.violationLog.count({ where: { participantId } });

    await pusherServer.trigger(`session-${sessionId}`, "violation", {
      participantId,
      participantName: participant.user.name,
      type: types[0],
      types,
      totalCount,
      timestamp,
    });

    return NextResponse.json({ ok: true, totalCount }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to log violation" },
      { status: 500 }
    );
  }
}
