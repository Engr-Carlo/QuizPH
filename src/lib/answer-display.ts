export type AnswerQuestionLike = {
  type?: string | null;
  options?: Array<{ id?: string | null; text?: string | null }> | null;
};

export function getAnswerDisplayText(
  answerText: string | null | undefined,
  question?: AnswerQuestionLike | null,
): string {
  if (answerText === null || answerText === undefined || String(answerText).trim() === "") {
    return "(no answer)";
  }

  const normalized = String(answerText).trim();

  if (!question) {
    return normalized;
  }

  if (question.type === "SHORT_ANSWER" || question.type === "MATH") {
    return normalized;
  }

  const matchedOption = question.options?.find((option) => {
    const optionId = option.id?.trim();
    const optionText = option.text?.trim();
    return optionId === normalized || optionText === normalized;
  });

  return matchedOption?.text?.trim() || normalized;
}
