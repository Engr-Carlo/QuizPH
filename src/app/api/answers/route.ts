import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { NextResponse } from "next/server";
import type { Option } from "@prisma/client";
import { selectQuestionsForSession } from "@/lib/utils";
import { touchUserActivity } from "@/lib/touch-user-activity";
import { checkRateLimit, jsonBodyError, readJsonBody, requestIdentity } from "@/lib/api-protection";
import { answerLimiter } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await readJsonBody(req, 24_000);
    const { participantId, questionId, answerText } = body;
    const rate = await checkRateLimit(answerLimiter, req, "/api/answers", requestIdentity(req, session.user.id));
    if (rate instanceof NextResponse) return rate;

    if (
      typeof participantId !== "string" || participantId.length > 100 ||
      typeof questionId !== "string" || questionId.length > 100 ||
      typeof answerText !== "string" || answerText.length > 20_000
    ) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Verify participant — slim select: only fields needed for auth + question selection + Pusher name
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      select: {
        id: true,
        userId: true,
        isFinished: true,
        sessionId: true,
        score: true,
        user: { select: { name: true } },
        session: {
          select: {
            id: true,
            status: true,
            quiz: {
              select: {
                questionSelectionMode: true,
                randomQuestionScope: true,
                questionDrawCount: true,
                // Only the 3 fields selectQuestionsForSession actually needs
                questions: {
                  select: { id: true, order: true, includedInQuiz: true },
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!participant || participant.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await touchUserActivity(session.user.id);

    if (participant.isFinished || participant.session.status !== "ACTIVE") {
      return NextResponse.json({ error: "Quiz is not active for this participant" }, { status: 400 });
    }

    const allowedQuestions = selectQuestionsForSession({
      questions: participant.session.quiz.questions,
      mode: participant.session.quiz.questionSelectionMode,
      drawCount: participant.session.quiz.questionDrawCount,
      seed: participant.session.quiz.questionSelectionMode === "RANDOM"
        && participant.session.quiz.randomQuestionScope === "PARTICIPANT"
          ? `${participant.sessionId}:${participant.id}`
          : participant.sessionId,
    });
    if (!allowedQuestions.some((question) => question.id === questionId)) {
      return NextResponse.json({ error: "Question is not assigned to this participant" }, { status: 403 });
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
    } else if (question.type === "MATH") {
      const correctOption = question.options.find((o: Option) => o.isCorrect);
      const normalize = (v: string) => {
        const stripped = v.replace(/\s/g, "");
        const n = parseFloat(stripped);
        return isNaN(n) ? stripped.toLowerCase() : n;
      };
      const correct = normalize(correctOption?.text ?? "");
      const student = normalize(answerText);
      if (typeof correct === "number" && typeof student === "number") {
        const tolerance = question.mathTolerance ?? 0;
        isCorrect = Math.abs(correct - student) <= (tolerance > 0 ? tolerance : 1e-9);
      } else {
        isCorrect = correct === student;
      }
    }

    const [answer, updatedParticipant] = await prisma.$transaction([
      prisma.answer.create({
        data: {
          participantId,
          questionId,
          answerText: String(answerText),
          isCorrect,
        },
      }),
      prisma.participant.update({
        where: { id: participantId },
        data: { score: { increment: isCorrect ? (question.points ?? 1) : 0 } },
        select: { score: true },
      }),
    ]);
    const finalScore = updatedParticipant.score;

    // Notify leaderboard update — name already loaded in the initial fetch
    await pusherServer.trigger(
      `session-${participant.sessionId}`,
      "answer-submitted",
      {
        participantId,
        participantName: participant.user.name,
        score: finalScore,
        isCorrect,
      }
    );

    return NextResponse.json({ answer, isCorrect, score: finalScore }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message === "BODY_TOO_LARGE" || error.message === "INVALID_JSON")) {
      return jsonBodyError(error);
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Already answered" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 }
    );
  }
}
