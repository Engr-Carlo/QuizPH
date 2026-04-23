"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

interface Participant {
  id: string;
  score: number;
  isFinished: boolean;
  user: { name: string; email: string };
  violations: { type: string; timestamp: string }[];
  answers: { questionId: string; answerText: string; isCorrect: boolean }[];
}

interface SessionData {
  id: string;
  code: string;
  status: string;
  quiz: {
    title: string;
    activeQuestionCount: number;
    questions: { id: string; text: string; options: { id: string; text: string; isCorrect: boolean }[] }[];
  };
  participants: Participant[];
}

export default function ResultsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const totalQuestions = data.quiz.activeQuestionCount;
  const sorted = [...data.participants].sort((a, b) => b.score - a.score);

  function generateCSV() {
    const headers = [
      "Rank",
      "Last Name",
      "First Name",
      "Email",
      "Score",
      "Score Value",
      "Accuracy",
      "Violations",
      "Status",
    ];
    const rows = sorted.map((p, idx) => {
      // Split "First Last" or "First Middle Last" → firstName = first token, lastName = rest
      const nameParts = p.user.name.trim().split(/\s+/);
      const firstName = nameParts.length > 0 ? nameParts[0] : "";
      const lastName = nameParts.slice(1).join(" ") || firstName;
      const accuracy = totalQuestions > 0 ? Math.round((p.score / totalQuestions) * 100) : 0;
      return [
        idx + 1,
        `"${lastName.replace(/"/g, '""')}"`,
        `"${firstName.replace(/"/g, '""')}"`,
        `"${p.user.email.replace(/"/g, '""')}"`,
        `="${p.score}/${totalQuestions}"`,
        p.score,
        `"${accuracy}%"`,
        p.violations.length,
        p.isFinished ? "Finished" : "In Progress",
      ];
    });
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data?.quiz.title ?? "results"}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">{data.quiz.title} — Results</h1>
            <p className="text-muted text-sm">
              Session Code: <span className="font-mono font-bold text-primary">{data.code}</span>
              {" • "}
              {data.participants.length} participants
            </p>
          </div>
          <button
            onClick={generateCSV}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>

        {/* Leaderboard */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background">
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Student</th>
                <th className="text-center px-4 py-3 font-medium">Score</th>
                <th className="text-center px-4 py-3 font-medium">Accuracy</th>
                <th className="text-center px-4 py-3 font-medium">Violations</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, idx) => (
                <Fragment key={p.id}>
                <tr
                  className="border-t border-border hover:bg-primary/5 cursor-pointer select-none"
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        idx === 0 ? "bg-yellow-100 text-yellow-700" :
                        idx === 1 ? "bg-gray-100 text-gray-500" :
                        idx === 2 ? "bg-orange-100 text-orange-600" :
                        "text-muted"
                      }`}>{idx + 1}</span>
                      <svg
                        width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className={`text-muted transition-transform duration-200 ${expandedId === p.id ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.user.name}</div>
                    <div className="text-xs text-muted">{p.user.email}</div>
                  </td>
                  <td className="text-center px-4 py-3 font-bold">
                    {p.score}/{totalQuestions}
                  </td>
                  <td className="text-center px-4 py-3">
                    {totalQuestions > 0
                      ? Math.round((p.score / totalQuestions) * 100)
                      : 0}
                    %
                  </td>
                  <td className="text-center px-4 py-3">
                    {p.violations.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-danger font-medium">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        {p.violations.length}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-success">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Clean
                      </span>
                    )}
                  </td>
                  <td className="text-center px-4 py-3">
                    {p.isFinished ? (
                      <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                        Finished
                      </span>
                    ) : (
                      <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">
                        In Progress
                      </span>
                    )}
                  </td>
                </tr>
                {expandedId === p.id && (
                  <tr className="bg-background border-t border-border">
                    <td colSpan={6} className="px-4 pb-4 pt-3">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Answer Review</p>
                      <div className="grid gap-2">
                        {data.quiz.questions.map((q, qi) => {
                          const ans = p.answers.find((a) => a.questionId === q.id);
                          const correctOption = q.options.find((o) => o.isCorrect)?.text;
                          return (
                            <div
                              key={q.id}
                              className={`text-xs rounded-lg p-3 border ${
                                ans?.isCorrect
                                  ? "border-success/30 bg-success/5"
                                  : "border-danger/30 bg-danger/5"
                              }`}
                            >
                              <p className="font-medium text-foreground mb-1">Q{qi + 1}. {q.text}</p>
                              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                                {ans?.isCorrect ? (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-success flex-shrink-0" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                                ) : (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-danger flex-shrink-0" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                )}
                                <span className={ans?.isCorrect ? "text-success" : "text-danger"}>
                                  {ans?.answerText || <em className="text-muted">No answer</em>}
                                </span>
                                {!ans?.isCorrect && correctOption && (
                                  <span className="text-muted">
                                    → <span className="text-foreground font-medium">{correctOption}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
