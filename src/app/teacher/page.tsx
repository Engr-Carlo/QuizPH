"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  timerType: string;
  duration: number;
  createdAt: string;
  _count: { questions: number; sessions: number };
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

// Simple inline bar chart — no external library needed
function QuizBarChart({ quizzes }: { quizzes: Quiz[] }) {
  const top = quizzes.slice(0, 8);
  const maxQ = Math.max(...top.map((q) => q._count.questions), 1);
  const maxS = Math.max(...top.map((q) => q._count.sessions), 1);
  const maxVal = Math.max(maxQ, maxS);

  return (
    <div>
      <div className="flex items-end gap-2 h-36">
        {top.map((quiz) => {
          const qHeight = Math.max((quiz._count.questions / maxVal) * 128, quiz._count.questions > 0 ? 6 : 0);
          const sHeight = Math.max((quiz._count.sessions / maxVal) * 128, quiz._count.sessions > 0 ? 6 : 0);
          const label = quiz.title.length > 10 ? quiz.title.slice(0, 10) + "..." : quiz.title;
          return (
            <div key={quiz.id} className="flex flex-col items-center gap-0.5 flex-1 min-w-0 group relative">
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {quiz.title}: {quiz._count.questions}Q / {quiz._count.sessions}S
              </div>
              <div className="flex items-end gap-0.5 w-full">
                <div
                  className="flex-1 rounded-t-sm"
                  style={{ height: qHeight, background: "var(--primary)", opacity: 0.85 }}
                />
                <div
                  className="flex-1 rounded-t-sm"
                  style={{ height: sHeight, background: "#0891B2", opacity: 0.7 }}
                />
              </div>
              <span className="text-[9px] text-muted truncate w-full text-center">{label}</span>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "var(--primary)" }} />
          <span className="text-xs text-muted">Questions</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "#0891B2" }} />
          <span className="text-xs text-muted">Sessions</span>
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const { data: session } = useSession();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/quiz")
      .then((r) => r.json())
      .then((data) => {
        setQuizzes(data);
        setLoading(false);
      });
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] || "Teacher";
  const totalQuestions = quizzes.reduce((s, q) => s + q._count.questions, 0);
  const totalSessions = quizzes.reduce((s, q) => s + q._count.sessions, 0);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs text-muted mb-0.5 uppercase tracking-wide">Welcome back</p>
          <h1 className="text-2xl font-bold text-foreground">{firstName}</h1>
          <p className="text-muted text-sm mt-0.5">
            {quizzes.length > 0
              ? `You have ${quizzes.length} quiz${quizzes.length !== 1 ? "zes" : ""}`
              : "Start by creating your first quiz"}
          </p>
        </div>
        <Link
          href="/teacher/quiz/create"
          className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition hover:opacity-90"
          style={{ background: "var(--primary)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Quiz
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : quizzes.length === 0 ? (
        /* Empty state */
        <div className="text-center py-20 bg-white border border-border rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-primary/8 text-primary flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <h3 className="font-semibold text-foreground mb-1">No quizzes yet</h3>
          <p className="text-muted text-sm mb-5 max-w-xs mx-auto">
            Create your first quiz to start engaging your students.
          </p>
          <Link
            href="/teacher/quiz/create"
            className="inline-flex items-center gap-2 px-5 py-2 text-white text-sm font-semibold rounded-lg transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            Create First Quiz
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Quizzes", value: quizzes.length, color: "text-primary" },
              { label: "Total Questions", value: totalQuestions, color: "text-foreground" },
              { label: "Sessions Run", value: totalSessions, color: "text-foreground" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-border rounded-xl p-4">
                <div className={`text-2xl font-bold ${color} mb-0.5`}>{value}</div>
                <div className="text-xs text-muted">{label}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          {quizzes.length >= 2 && (
            <div className="bg-white border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Quiz Overview</h2>
              <QuizBarChart quizzes={quizzes} />
            </div>
          )}

          {/* Quiz list */}
          <div>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Your Quizzes</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {quizzes.map((quiz) => (
                <Link
                  key={quiz.id}
                  href={`/teacher/quiz/${quiz.id}`}
                  className="bg-white border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all block"
                >
                  <div className="w-1.5 h-6 rounded-full mb-3" style={{ background: "var(--primary)", opacity: 0.7 }} />
                  <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-2">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="text-muted text-xs mb-3 line-clamp-2">{quiz.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-xs text-muted border border-border rounded px-2 py-0.5">
                      {quiz._count.questions} questions
                    </span>
                    <span className="text-xs text-muted border border-border rounded px-2 py-0.5">
                      {quiz._count.sessions} sessions
                    </span>
                    <span className="text-xs text-muted border border-border rounded px-2 py-0.5">
                      {formatDuration(quiz.duration)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
