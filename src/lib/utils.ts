export function generateQuizCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function seededHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function seededShuffleArray<T>(array: T[], seed: string): T[] {
  const shuffled = [...array];
  let state = seededHash(seed) || 1;

  function next() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  }

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

type SelectableQuestion = {
  id: string;
  order: number;
  includedInQuiz?: boolean;
};

export function selectQuestionsForSession<T extends SelectableQuestion>(params: {
  questions: T[];
  mode: "ALL" | "RANDOM" | "MANUAL";
  drawCount?: number | null;
  seed: string;
}) {
  const ordered = [...params.questions].sort((a, b) => a.order - b.order);

  if (params.mode === "ALL") {
    return ordered;
  }

  const eligible = ordered.filter((question) => question.includedInQuiz !== false);

  if (params.mode === "MANUAL") {
    return eligible;
  }

  const shuffled = seededShuffleArray(eligible, params.seed);
  const limit = Math.max(1, Math.min(params.drawCount ?? eligible.length, eligible.length));
  return shuffled.slice(0, limit);
}

export function getQuizActiveQuestionCount(params: {
  questions: SelectableQuestion[];
  mode: "ALL" | "RANDOM" | "MANUAL";
  drawCount?: number | null;
}) {
  if (params.mode === "ALL") return params.questions.length;
  if (params.mode === "MANUAL") return params.questions.filter((question) => question.includedInQuiz !== false).length;

  const eligibleCount = params.questions.filter((question) => question.includedInQuiz !== false).length;
  return Math.max(1, Math.min(params.drawCount ?? eligibleCount, eligibleCount));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
