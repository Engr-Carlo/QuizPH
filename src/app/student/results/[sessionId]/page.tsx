"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  type: string;
  text: string;
  options: Option[];
}

interface Answer {
  questionId: string;
  answerText: string;
  isCorrect: boolean;
}

interface ParticipantData {
  id: string;
  score: number;
  isFinished: boolean;
  answers: Answer[];
}

interface SessionData {
  id: string;
  code: string;
  quiz: {
    title: string;
    questions: Question[];
  };
  participants: ParticipantData[];
}

export default function StudentResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const participantId = searchParams.get("participantId") || "";

  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted">Loading results...</div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">Session not found</div>
      </DashboardLayout>
    );
  }

  const participant = data.participants.find((p) => p.id === participantId);
  if (!participant) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">Participant not found</div>
      </DashboardLayout>
    );
  }

  const totalQuestions = data.quiz.questions.length;
  const correctCount = participant.answers.filter((a) => a.isCorrect).length;
  const accuracy =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Build a lookup of answers by questionId
  const answerMap = new Map(
    participant.answers.map((a) => [a.questionId, a])
  );

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold mb-1">
          {data.quiz.title} — Your Results
        </h1>
        <p className="text-muted text-sm mb-6">
          Session Code:{" "}
          <span className="font-mono font-bold text-primary">{data.code}</span>
        </p>

        {/* Score summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <div className="text-4xl font-bold text-primary">
              {participant.score}
            </div>
            <div className="text-sm text-muted">Score</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <div className="text-4xl font-bold text-primary">{accuracy}%</div>
            <div className="text-sm text-muted">Accuracy</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <div className="text-4xl font-bold">
              <span className="text-success">{correctCount}</span>
              <span className="text-muted text-2xl">/{totalQuestions}</span>
            </div>
            <div className="text-sm text-muted">Correct</div>
          </div>
        </div>

        {/* Per-question breakdown */}
        <h2 className="text-lg font-semibold mb-4">Question Breakdown</h2>
        <div className="space-y-4">
          {data.quiz.questions.map((q, idx) => {
            const answer = answerMap.get(q.id);
            const isCorrect = answer?.isCorrect ?? false;
            const isUnanswered = !answer;

            // Find what the student answered
            let studentAnswerDisplay = "Not answered";
            if (answer) {
              if (q.type === "SHORT_ANSWER") {
                studentAnswerDisplay = answer.answerText;
              } else {
                const selectedOpt = q.options.find(
                  (o) => o.id === answer.answerText || o.text === answer.answerText
                );
                studentAnswerDisplay = selectedOpt?.text || answer.answerText;
              }
            }

            const correctOption = q.options.find((o) => o.isCorrect);

            return (
              <div
                key={q.id}
                className={`bg-card border rounded-xl p-5 ${
                  isUnanswered
                    ? "border-border"
                    : isCorrect
                    ? "border-success/50"
                    : "border-danger/50"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs text-muted uppercase">
                      {q.type === "MCQ"
                        ? "Multiple Choice"
                        : q.type === "TRUE_FALSE"
                        ? "True/False"
                        : "Short Answer"}
                    </span>
                  </div>
                  {isUnanswered ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted/20 text-muted">
                      Skipped
                    </span>
                  ) : isCorrect ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
                      ✓ Correct
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-danger/20 text-danger font-medium">
                      ✕ Wrong
                    </span>
                  )}
                </div>

                <p className="font-medium mb-3">{q.text}</p>

                {/* Show options with correct/wrong markings */}
                {q.type === "SHORT_ANSWER" ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted">Your answer:</span>
                      <span
                        className={
                          isCorrect
                            ? "text-success font-medium"
                            : "text-danger font-medium"
                        }
                      >
                        {studentAnswerDisplay}
                      </span>
                    </div>
                    {!isCorrect && correctOption && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted">Correct answer:</span>
                        <span className="text-success font-medium">
                          {correctOption.text}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {q.options.map((opt) => {
                      const isStudentChoice =
                        answer &&
                        (opt.id === answer.answerText ||
                          opt.text === answer.answerText);
                      const isCorrectOpt = opt.isCorrect;

                      let borderClass = "border-border";
                      let bgClass = "";
                      let textClass = "";

                      if (isCorrectOpt) {
                        borderClass = "border-success/50";
                        bgClass = "bg-success/5";
                        textClass = "text-success";
                      }
                      if (isStudentChoice && !isCorrect) {
                        borderClass = "border-danger/50";
                        bgClass = "bg-danger/5";
                        textClass = "text-danger";
                      }
                      if (isStudentChoice && isCorrect) {
                        borderClass = "border-success/50";
                        bgClass = "bg-success/10";
                        textClass = "text-success";
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${borderClass} ${bgClass}`}
                        >
                          <span className={textClass}>
                            {isCorrectOpt
                              ? "✓"
                              : isStudentChoice
                              ? "✕"
                              : "○"}
                          </span>
                          <span
                            className={
                              isStudentChoice || isCorrectOpt
                                ? "font-medium"
                                : "text-muted"
                            }
                          >
                            {opt.text}
                          </span>
                          {isStudentChoice && (
                            <span className="text-xs text-muted ml-auto">
                              Your answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Back to dashboard */}
        <div className="mt-8 text-center">
          <a
            href="/student"
            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
}
