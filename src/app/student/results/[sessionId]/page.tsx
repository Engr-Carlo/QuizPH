"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

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

const Q_TYPE_LABELS: Record<string, string> = {
  MCQ: "Multiple Choice",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short Answer",
};

export default function StudentResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const participantId = searchParams.get("participantId") || "";

  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted">Session not found.</div>
      </DashboardLayout>
    );
  }

  const participant = data.participants.find((p) => p.id === participantId);
  if (!participant) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted">Participant not found.</div>
      </DashboardLayout>
    );
  }

  const totalQuestions = data.quiz.questions.length;
  const correctCount = participant.answers.filter((a) => a.isCorrect).length;
  const wrongCount = participant.answers.filter((a) => !a.isCorrect).length;
  const skippedCount = totalQuestions - participant.answers.length;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Score color based on accuracy
  const scoreColor = accuracy >= 80 ? "text-success" : accuracy >= 60 ? "text-warning" : "text-danger";
  const scoreMsg = accuracy >= 80 ? "Excellent!" : accuracy >= 60 ? "Good job!" : "Keep practicing!";

  const answerMap = new Map(participant.answers.map((a) => [a.questionId, a]));

  return (
    <DashboardLayout>
      <div className="max-w-3xl">

        {/* Header */}
        <div className="mb-6">
          <p className="text-sm text-muted mb-1">
            Session Code:{" "}
            <span className="font-mono font-bold text-primary">{data.code}</span>
          </p>
          <h1 className="text-2xl font-extrabold text-foreground">{data.quiz.title}</h1>
        </div>

        {/* Score summary card */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex items-center gap-8">
            {/* Big score circle */}
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={accuracy >= 80 ? "var(--success)" : accuracy >= 60 ? "var(--warning)" : "var(--danger)"}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - accuracy / 100)}`}
                  style={{ transition: "stroke-dashoffset 0.8s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-extrabold leading-none ${scoreColor}`}>{accuracy}%</span>
                <span className="text-[10px] text-muted mt-0.5">accuracy</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1">
              <p className={`text-lg font-extrabold ${scoreColor} mb-3`}>{scoreMsg}</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Score", value: participant.score, color: "text-primary", bg: "bg-primary/8" },
                  { label: "Correct", value: correctCount, color: "text-success", bg: "bg-success/8" },
                  { label: "Wrong", value: wrongCount, color: "text-danger", bg: "bg-danger/8" },
                  ...(skippedCount > 0 ? [{ label: "Skipped", value: skippedCount, color: "text-muted", bg: "bg-surface" }] : []),
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                    <div className={`text-xl font-extrabold ${color}`}>{value}</div>
                    <div className="text-[11px] text-muted">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Question breakdown */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground">Question Breakdown</h2>
          <span className="text-xs text-muted">{totalQuestions} question{totalQuestions !== 1 ? "s" : ""}</span>
        </div>

        <div className="space-y-3">
          {data.quiz.questions.map((q, idx) => {
            const answer = answerMap.get(q.id);
            const isCorrect = answer?.isCorrect ?? false;
            const isUnanswered = !answer;

            let studentAnswerDisplay = "Not answered";
            if (answer) {
              if (q.type === "SHORT_ANSWER") {
                studentAnswerDisplay = answer.answerText;
              } else {
                const sel = q.options.find((o) => o.id === answer.answerText || o.text === answer.answerText);
                studentAnswerDisplay = sel?.text || answer.answerText;
              }
            }

            const correctOption = q.options.find((o) => o.isCorrect);

            const borderStyle = isUnanswered
              ? "border-border"
              : isCorrect
              ? "border-success/40"
              : "border-danger/40";

            const bgStyle = isUnanswered ? "" : isCorrect ? "bg-success/3" : "bg-danger/3";

            return (
              <div
                key={q.id}
                className={`bg-card border-2 rounded-2xl p-5 shadow-sm transition ${borderStyle} ${bgStyle}`}
              >
                {/* Question header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted/60">Q{idx + 1}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface border border-border text-muted">
                      {Q_TYPE_LABELS[q.type] || q.type}
                    </span>
                  </div>
                  {isUnanswered ? (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted/10 text-muted">
                      Skipped
                    </span>
                  ) : isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-success/15 text-success">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-danger/15 text-danger">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Incorrect
                    </span>
                  )}
                </div>

                {/* Question text */}
                <p className="font-semibold text-sm text-foreground mb-3">{q.text}</p>

                {/* Answer breakdown */}
                {q.type === "SHORT_ANSWER" ? (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted w-24 flex-shrink-0">Your answer:</span>
                      <span className={isCorrect ? "text-success font-semibold" : "text-danger font-semibold"}>
                        {studentAnswerDisplay}
                      </span>
                    </div>
                    {!isCorrect && correctOption && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted w-24 flex-shrink-0">Correct answer:</span>
                        <span className="text-success font-semibold">{correctOption.text}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {q.options.map((opt) => {
                      const isStudentChoice = answer &&
                        (opt.id === answer.answerText || opt.text === answer.answerText);
                      const isCorrectOpt = opt.isCorrect;

                      let cls = "border-border text-muted bg-surface";
                      if (isCorrectOpt) cls = "border-success/40 bg-success/8 text-success";
                      if (isStudentChoice && !isCorrect) cls = "border-danger/40 bg-danger/8 text-danger";
                      if (isStudentChoice && isCorrect) cls = "border-success/50 bg-success/12 text-success";

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-2.5 text-sm px-4 py-2.5 rounded-xl border ${cls}`}
                        >
                          <span className="w-4 h-4 flex-shrink-0 text-center font-bold inline-flex items-center justify-center">
                            {isCorrectOpt ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            ) : isStudentChoice ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            ) : (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <circle cx="12" cy="12" r="5"/>
                              </svg>
                            )}
                          </span>
                          <span className={`flex-1 ${isStudentChoice || isCorrectOpt ? "font-semibold" : ""}`}>
                            {opt.text}
                          </span>
                          {isStudentChoice && (
                            <span className="text-[10px] opacity-60 ml-auto">Your answer</span>
                          )}
                          {isCorrectOpt && !isStudentChoice && (
                            <span className="text-[10px] opacity-60 ml-auto">Correct</span>
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

        {/* Back button */}
        <div className="mt-8">
          <Link
            href="/student"
            className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl shadow-sm transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

