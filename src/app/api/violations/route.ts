import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { violationSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = violationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { participantId, sessionId, type } = parsed.data;

    // Verify participant belongs to user
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { user: { select: { name: true } } },
    });

    if (!participant || participant.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const violation = await prisma.violationLog.create({
      data: {
        participantId,
        sessionId,
        type: type as "FULLSCREEN_EXIT" | "TAB_SWITCH" | "RIGHT_CLICK" | "DEVTOOLS" | "COPY_PASTE",
      },
    });

    // Get total violation count for this participant
    const totalCount = await prisma.violationLog.count({
      where: { participantId },
    });

    // Get violation count by type
    const typeCounts = await prisma.violationLog.groupBy({
      by: ["type"],
      where: { participantId },
      _count: true,
    });

    // Notify teacher in real-time
    await pusherServer.trigger(`session-${sessionId}`, "violation", {
      participantId,
      participantName: participant.user.name,
      type,
      totalCount,
      typeCounts: typeCounts.map((t: { type: string; _count: number }) => ({ type: t.type, count: t._count })),
      timestamp: violation.timestamp,
    });

    return NextResponse.json({ violation, totalCount }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to log violation" },
      { status: 500 }
    );
  }
}
