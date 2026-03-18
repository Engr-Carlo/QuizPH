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

const TYPE_COLORS = [
  "bg-primary/8 border-primary/20",
  "bg-secondary/8 border-secondary/20",
  "bg-accent/8 border-accent/20",
  "bg-success/8 border-success/20",
];

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export default function TeacherDashboard() {
  const { data: session } = useSession();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/quiz")
      .then((r) => r.json())
      .then((data) => { setQuizzes(data); setLoading(false); });
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] || "Teacher";

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm text-muted mb-0.5">Good day,</p>
          <h1 className="text-2xl font-extrabold text-foreground">{firstName} ðŸ‘‹</h1>
          <p className="text-muted text-sm mt-1">
            {quizzes.length > 0
              ? `You have ${quizzes.length} quiz${quizzes.length !== 1 ? "zes" : ""}`
              : "Start by creating your first quiz"}
          </p>
        </div>
        <Link
          href="/teacher/quiz/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl shadow-sm transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
        >
          <span className="text-base leading-none">+</span> New Quiz
        </Link>
      </div>

      {/* Stats row */}
      {quizzes.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "Quizzes",
              value: quizzes.length,
              icon: "ðŸ“‹",
              color: "text-primary",
              bg: "bg-primary/8",
            },
            {
              label: "Total Questions",
              value: quizzes.reduce((sum, q) => sum + q._count.questions, 0),
              icon: "â“",
              color: "text-secondary",
              bg: "bg-secondary/8",
            },
            {
              label: "Sessions Run",
              value: quizzes.reduce((sum, q) => sum + q._count.sessions, 0),
              icon: "ðŸŽ®",
              color: "text-success",
              bg: "bg-success/8",
            },
          ].map(({ label, value, icon, color, bg }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center text-base mb-3`}>{icon}</div>
              <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
              <div className="text-xs text-muted mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quiz list */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted">Loading quizzesâ€¦</p>
          </div>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl">
          <div className="text-5xl mb-4">ðŸ“</div>
          <h3 className="font-extrabold text-lg text-foreground mb-2">No quizzes yet</h3>
          <p className="text-muted text-sm mb-6 max-w-xs mx-auto">
            Create your first quiz to start engaging your students with live, monitored assessments.
          </p>
          <Link
            href="/teacher/quiz/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl shadow-sm transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
          >
            + Create Your First Quiz
          </Link>
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">Your Quizzes</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz, idx) => (
              <Link
                key={quiz.id}
                href={`/teacher/quiz/${quiz.id}`}
                className={`bg-card border rounded-2xl p-5 transition card-hover block ${TYPE_COLORS[idx % TYPE_COLORS.length]}`}
              >
                {/* Card top accent line */}
                <div
                  className="h-1 w-12 rounded-full mb-4 opacity-60"
                  style={{ background: "var(--primary)" }}
                />
                <h3 className="font-bold text-base text-foreground mb-1 line-clamp-2">
                  {quiz.title}
                </h3>
                {quiz.description && (
                  <p className="text-muted text-xs mb-3 line-clamp-2">{quiz.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 text-xs text-muted bg-surface px-2.5 py-1 rounded-full">
                    â“ {quiz._count.questions} questions
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted bg-surface px-2.5 py-1 rounded-full">
                    ðŸŽ® {quiz._count.sessions} sessions
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted bg-surface px-2.5 py-1 rounded-full">
                    â±ï¸ {formatDuration(quiz.duration)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
