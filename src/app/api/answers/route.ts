import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { NextResponse } from "next/server";
import type { Option } from "@prisma/client";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { participantId, questionId, answerText } = await req.json();

    if (!participantId || !questionId || answerText === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Verify participant
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
    });

    if (!participant || participant.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (participant.isFinished) {
      return NextResponse.json({ error: "Quiz already submitted" }, { status: 400 });
    }

    // Check if already answered this question
    const existing = await prisma.answer.findFirst({
      where: { participantId, questionId },
    });

    if (existing) {
      return NextResponse.json({ error: "Already answered" }, { status: 409 });
    }

    // Check answer correctness
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    let isCorrect = false;

    if (question.type === "MCQ" || question.type === "TRUE_FALSE") {
      const correctOption = question.options.find((o: Option) => o.isCorrect);
      isCorrect = correctOption?.id === answerText || correctOption?.text === answerText;
    } else if (question.type === "SHORT_ANSWER") {
      const correctOption = question.options.find((o: Option) => o.isCorrect);
      isCorrect =
        correctOption?.text.toLowerCase().trim() ===
        answerText.toLowerCase().trim();
    }

    const answer = await prisma.answer.create({
      data: {
        participantId,
        questionId,
        answerText: String(answerText),
        isCorrect,
      },
    });

    // Update score if correct
    if (isCorrect) {
      await prisma.participant.update({
        where: { id: participantId },
        data: { score: { increment: 1 } },
      });
    }

    // Notify leaderboard update
    const updatedParticipant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { user: { select: { name: true } } },
    });

    await pusherServer.trigger(
      `session-${participant.sessionId}`,
      "answer-submitted",
      {
        participantId,
        participantName: updatedParticipant?.user.name,
        score: updatedParticipant?.score,
        isCorrect,
      }
    );

    return NextResponse.json({ answer, isCorrect }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 }
    );
  }
}
