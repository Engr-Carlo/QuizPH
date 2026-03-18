import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { participantId } = await req.json();

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { user: { select: { name: true } } },
    });

    if (!participant || participant.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.participant.update({
      where: { id: participantId },
      data: { isFinished: true },
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

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to submit quiz" },
      { status: 500 }
    );
  }
}
