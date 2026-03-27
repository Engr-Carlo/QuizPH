import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/student/sessions — last 8 sessions the current student participated in
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const participants = await prisma.participant.findMany({
    where: { userId: session.user.id },
    take: 8,
    orderBy: { joinedAt: "desc" },
    select: {
      id: true,
      score: true,
      isFinished: true,
      joinedAt: true,
      session: {
        select: {
          id: true,
          code: true,
          status: true,
          endedAt: true,
          quiz: {
            select: {
              title: true,
              _count: { select: { questions: true } },
            },
          },
        },
      },
      _count: { select: { violations: true } },
    },
  });

  return NextResponse.json(participants);
}
