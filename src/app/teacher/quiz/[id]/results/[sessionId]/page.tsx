"use client";

import { useEffect, useState, useCallback } from "react";
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
    questions: { id: string; text: string; options: { id: string; text: string; isCorrect: boolean }[] }[];
  };
  participants: Participant[];
}

export default function ResultsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const totalQuestions = data.quiz.questions.length;
  const sorted = [...data.participants].sort((a, b) => b.score - a.score);

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold mb-1">{data.quiz.title} — Results</h1>
        <p className="text-muted text-sm mb-6">
          Session Code: <span className="font-mono font-bold text-primary">{data.code}</span>
          {" • "}
          {data.participants.length} participants
        </p>

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
                <tr key={p.id} className="border-t border-border hover:bg-primary/5">
                  <td className="px-4 py-3">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
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
                      <span className="text-danger font-medium">
                        ⚠️ {p.violations.length}
                      </span>
                    ) : (
                      <span className="text-success">✓ Clean</span>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
