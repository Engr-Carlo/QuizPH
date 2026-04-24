import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const url = new URL(req.url);
  const participantId = url.searchParams.get("participantId");

  if (!participantId) {
    return NextResponse.json({ error: "participantId required" }, { status: 400 });
  }

  // Uses @@index([participantId]) — efficient lookup, scoped to this participant
  const answers = await prisma.answer.findMany({
    where: { participantId },
    select: {
      id: true,
      answerText: true,
      isCorrect: true,
      answeredAt: true,
      question: { select: { text: true, order: true, type: true } },
    },
    orderBy: { question: { order: "asc" } },
  });

  return NextResponse.json(answers);
}
