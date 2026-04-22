import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: quizId, questionId } = await params;
  const body = await req.json();

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Snapshot old options before deleting — needed to map stored answerText (old option IDs) → text
  const oldOptions = await prisma.option.findMany({ where: { questionId } });
  const oldIdToText = new Map(oldOptions.map((o) => [o.id, o.text]));

  // Delete old options and recreate + update question inside one transaction
  const updated = await prisma.$transaction(async (tx) => {
    await tx.option.deleteMany({ where: { questionId } });

    return tx.question.update({
      where: { id: questionId },
      data: {
        type: body.type,
        topic: body.topic ?? "General",
        text: body.text,
        order: body.order,
        includedInQuiz: body.includedInQuiz ?? true,
        mathTolerance: body.type === "MATH" ? (body.mathTolerance ?? 0) : 0,
        options: {
          create: body.options?.map((opt: { text: string; isCorrect: boolean }) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
          })) ?? [],
        },
      },
      include: { options: true },
    });
  });

  // ── Re-grade existing answers ───────────────────────────────────────────
  // Find the new correct option
  const newCorrectOption = updated.options.find((o) => o.isCorrect);

  // All answers ever submitted for this question (across all sessions)
  const existingAnswers = await prisma.answer.findMany({
    where: { questionId },
  });

  if (existingAnswers.length > 0) {
    const normalize = (v: string) => {
      const stripped = v.replace(/\s/g, "");
      const n = parseFloat(stripped);
      return isNaN(n) ? stripped.toLowerCase() : n;
    };

    const correctNormalized =
      body.type === "MATH" ? normalize(newCorrectOption?.text ?? "") : null;

    // Compute which answers changed correctness
    type ScoreChange = { answerId: string; participantId: string; delta: number };
    const changes: ScoreChange[] = [];

    for (const answer of existingAnswers) {
      // answerText is the old option ID for MCQ/TRUE_FALSE, raw text for SHORT_ANSWER/MATH
      const chosenText =
        body.type === "MCQ" || body.type === "TRUE_FALSE"
          ? (oldIdToText.get(answer.answerText) ?? answer.answerText)
          : answer.answerText;

      let newIsCorrect = false;
      if (body.type === "MCQ" || body.type === "TRUE_FALSE") {
        newIsCorrect = chosenText === newCorrectOption?.text;
      } else if (body.type === "SHORT_ANSWER") {
        newIsCorrect =
          (newCorrectOption?.text ?? "").toLowerCase().trim() ===
          chosenText.toLowerCase().trim();
      } else if (body.type === "MATH") {
        const student = normalize(chosenText);
        if (
          typeof correctNormalized === "number" &&
          typeof student === "number"
        ) {
          const tolerance = body.mathTolerance ?? 0;
          newIsCorrect =
            Math.abs(correctNormalized - student) <=
            (tolerance > 0 ? tolerance : 1e-9);
        } else {
          newIsCorrect = correctNormalized === student;
        }
      }

      if (answer.isCorrect !== newIsCorrect) {
        changes.push({
          answerId: answer.id,
          participantId: answer.participantId,
          delta: newIsCorrect ? 1 : -1,
        });
      }
    }

    if (changes.length > 0) {
      // Flat list of operations — Prisma runs them all in one transaction
      await prisma.$transaction([
        ...changes.map((c) =>
          prisma.answer.update({
            where: { id: c.answerId },
            data: { isCorrect: c.delta === 1 },
          })
        ),
        ...changes.map((c) =>
          prisma.participant.update({
            where: { id: c.participantId },
            data: { score: { increment: c.delta } },
          })
        ),
      ]);
    }
  }

  return NextResponse.json({
    ...updated,
    regraded: existingAnswers.length,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: quizId, questionId } = await params;

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.question.delete({ where: { id: questionId } });

  return NextResponse.json({ message: "Deleted" });
}
