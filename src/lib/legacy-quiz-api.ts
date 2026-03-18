import { prisma } from "@/lib/prisma";

type LegacyQuizRow = {
  id: string;
  title: string;
  description: string | null;
  timerType: string;
  duration: number;
  createdAt: Date;
  questionCount: number | string;
  sessionCount: number | string;
};

type LegacyQuizDetailRow = {
  id: string;
  title: string;
  description: string | null;
  timerType: string;
  duration: number;
  questionSelectionMode: string;
  randomQuestionScope: string;
  questionDrawCount: number | null;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  antiCheatEnabled: boolean;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
};

type LegacyQuestionRow = {
  id: string;
  type: string;
  topic: string;
  text: string;
  order: number;
  includedInQuiz: boolean;
  quizId: string;
};

type LegacyOptionRow = {
  id: string;
  text: string;
  isCorrect: boolean;
  questionId: string;
};

type LegacySessionRow = {
  id: string;
  code: string;
  status: string;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  participantCount: number | string;
};

async function getTableColumns(tableName: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    tableName
  );

  return new Set(rows.map((row: { column_name: string }) => row.column_name));
}

export async function listQuizzesWithLegacyFallback(teacherId: string) {
  const rows = await prisma.$queryRawUnsafe<LegacyQuizRow[]>(
    `
      SELECT
        q.id,
        q.title,
        q.description,
        q."timerType" AS "timerType",
        q.duration,
        q."createdAt" AS "createdAt",
        (
          SELECT COUNT(*)::int
          FROM "Question" question
          WHERE question."quizId" = q.id
        ) AS "questionCount",
        (
          SELECT COUNT(*)::int
          FROM "QuizSession" session
          WHERE session."quizId" = q.id
        ) AS "sessionCount"
      FROM "Quiz" q
      WHERE q."teacherId" = $1
      ORDER BY q."createdAt" DESC
    `,
    teacherId
  );

  return rows.map((row: LegacyQuizRow) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    timerType: row.timerType,
    duration: Number(row.duration),
    createdAt: row.createdAt,
    _count: {
      questions: Number(row.questionCount),
      sessions: Number(row.sessionCount),
    },
  }));
}

export async function getQuizWithLegacyFallback(quizId: string) {
  const [quizColumns, questionColumns] = await Promise.all([
    getTableColumns("Quiz"),
    getTableColumns("Question"),
  ]);

  const quizSelect = [
    `q.id`,
    `q.title`,
    `q.description`,
    `q."timerType" AS "timerType"`,
    `q.duration`,
    quizColumns.has("questionSelectionMode")
      ? `q."questionSelectionMode" AS "questionSelectionMode"`
      : `'ALL'::text AS "questionSelectionMode"`,
    quizColumns.has("randomQuestionScope")
      ? `q."randomQuestionScope" AS "randomQuestionScope"`
      : `'SESSION'::text AS "randomQuestionScope"`,
    quizColumns.has("questionDrawCount")
      ? `q."questionDrawCount" AS "questionDrawCount"`
      : `NULL::integer AS "questionDrawCount"`,
    quizColumns.has("randomizeQuestions")
      ? `q."randomizeQuestions" AS "randomizeQuestions"`
      : `false AS "randomizeQuestions"`,
    quizColumns.has("randomizeAnswers")
      ? `q."randomizeAnswers" AS "randomizeAnswers"`
      : `false AS "randomizeAnswers"`,
    quizColumns.has("antiCheatEnabled")
      ? `q."antiCheatEnabled" AS "antiCheatEnabled"`
      : `false AS "antiCheatEnabled"`,
    `q."teacherId" AS "teacherId"`,
    `q."createdAt" AS "createdAt"`,
    `q."updatedAt" AS "updatedAt"`,
  ].join(",\n        ");

  const questionSelect = [
    `question.id`,
    `question.type`,
    questionColumns.has("topic")
      ? `question.topic`
      : `'General'::text AS topic`,
    `question.text`,
    `question."order" AS "order"`,
    questionColumns.has("includedInQuiz")
      ? `question."includedInQuiz" AS "includedInQuiz"`
      : `true AS "includedInQuiz"`,
    `question."quizId" AS "quizId"`,
  ].join(",\n        ");

  const quizRows = await prisma.$queryRawUnsafe<LegacyQuizDetailRow[]>(
    `
      SELECT
        ${quizSelect}
      FROM "Quiz" q
      WHERE q.id = $1
      LIMIT 1
    `,
    quizId
  );

  const quiz = quizRows[0];
  if (!quiz) {
    return null;
  }

  const [questions, options, sessions] = await Promise.all([
    prisma.$queryRawUnsafe<LegacyQuestionRow[]>(
      `
        SELECT
          ${questionSelect}
        FROM "Question" question
        WHERE question."quizId" = $1
        ORDER BY question."order" ASC
      `,
      quizId
    ),
    prisma.$queryRawUnsafe<LegacyOptionRow[]>(
      `
        SELECT
          option.id,
          option.text,
          option."isCorrect" AS "isCorrect",
          option."questionId" AS "questionId"
        FROM "Option" option
        INNER JOIN "Question" question ON question.id = option."questionId"
        WHERE question."quizId" = $1
      `,
      quizId
    ),
    prisma.$queryRawUnsafe<LegacySessionRow[]>(
      `
        SELECT
          session.id,
          session.code,
          session.status,
          session."startedAt" AS "startedAt",
          session."endedAt" AS "endedAt",
          session."createdAt" AS "createdAt",
          (
            SELECT COUNT(*)::int
            FROM "Participant" participant
            WHERE participant."sessionId" = session.id
          ) AS "participantCount"
        FROM "QuizSession" session
        WHERE session."quizId" = $1
        ORDER BY session."createdAt" DESC
      `,
      quizId
    ),
  ]);

  return {
    ...quiz,
    duration: Number(quiz.duration),
    questionDrawCount: quiz.questionDrawCount === null ? null : Number(quiz.questionDrawCount),
    questions: questions.map((question: LegacyQuestionRow) => ({
      ...question,
      order: Number(question.order),
      includedInQuiz: Boolean(question.includedInQuiz),
      options: options.filter((option: LegacyOptionRow) => option.questionId === question.id),
    })),
    sessions: sessions.map((session: LegacySessionRow) => ({
      id: session.id,
      code: session.code,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      createdAt: session.createdAt,
      _count: {
        participants: Number(session.participantCount),
      },
    })),
  };
}