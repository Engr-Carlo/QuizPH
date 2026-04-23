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

    // Rate-limit: silently drop if this participant has logged > 10 violations in the last 60s
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentCount = await prisma.violationLog.count({
      where: { participantId, timestamp: { gt: oneMinuteAgo } },
    });
    if (recentCount >= 10) {
      return NextResponse.json({ message: "ok" }, { status: 200 });
    }

    const violation = await prisma.violationLog.create({
      data: {
        participantId,
        sessionId,
        type: type as "FULLSCREEN_EXIT" | "TAB_SWITCH" | "RIGHT_CLICK" | "DEVTOOLS" | "COPY_PASTE" | "SCREENSHOT_ATTEMPT",
      },
    });

    // Single query — compute total + breakdown in JS instead of 2 separate DB round-trips
    const allViolations = await prisma.violationLog.findMany({
      where: { participantId },
      select: { type: true },
    });

    const totalCount = allViolations.length;
    const typeMap = new Map<string, number>();
    for (const v of allViolations) {
      typeMap.set(v.type, (typeMap.get(v.type) ?? 0) + 1);
    }
    const typeCounts = Array.from(typeMap.entries()).map(([t, count]) => ({ type: t, count }));

    // Notify teacher in real-time
    await pusherServer.trigger(`session-${sessionId}`, "violation", {
      participantId,
      participantName: participant.user.name,
      type,
      totalCount,
      typeCounts,
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
