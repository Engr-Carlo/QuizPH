import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH /api/participants/:id — save lastQuestionIndex for resume
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ participantId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { participantId } = await params;
  const body = await req.json();
  const { lastQuestionIndex } = body;

  if (typeof lastQuestionIndex !== "number") {
    return NextResponse.json({ error: "lastQuestionIndex required" }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({ where: { id: participantId } });

  if (!participant || participant.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.participant.update({
    where: { id: participantId },
    data: { lastQuestionIndex },
  });

  return NextResponse.json({ ok: true });
}
