"use client";

import { useEffect, useMemo, useState } from "react";
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
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export default function TeacherMyQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadQuizzes() {
      try {
        const res = await fetch("/api/quiz");
        const payload = await res.json().catch(() => null);

        if (!res.ok) {
          setError(payload?.error || "Failed to load quizzes");
          setQuizzes([]);
          return;
        }

        setQuizzes(Array.isArray(payload) ? payload : []);
      } catch {
        setError("Failed to load quizzes");
        setQuizzes([]);
      } finally {
        setLoading(false);
      }
    }

    loadQuizzes();
  }, []);

  const filteredQuizzes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return quizzes;

    return quizzes.filter((quiz) => {
      const haystack = `${quiz.title} ${quiz.description ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [quizzes, search]);

  const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz._count.questions, 0);
  const totalSessions = quizzes.reduce((sum, quiz) => sum + quiz._count.sessions, 0);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Teacher workspace</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">My Quizzes</h1>
            <p className="mt-1 text-sm text-muted">
              {quizzes.length} total quiz{quizzes.length === 1 ? "" : "zes"} · {totalQuestions} question{totalQuestions === 1 ? "" : "s"} · {totalSessions} session{totalSessions === 1 ? "" : "s"}
            </p>
          </div>

          <Link
            href="/teacher/quiz/create"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Create Quiz
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <label className="sr-only" htmlFor="quiz-search">Search quizzes</label>
              <input
                id="quiz-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search quizzes by title or description"
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-border bg-white">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
            <h2 className="text-xl font-bold text-foreground">No quizzes match your search</h2>
            <p className="mt-2 text-sm text-muted">Try another keyword or create a fresh quiz.</p>
            <Link
              href="/teacher/quiz/create"
              className="mt-6 inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              Create a Quiz
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredQuizzes.map((quiz) => (
              <article key={quiz.id} className="flex flex-col rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                      {quiz.timerType === "PER_QUESTION" ? "Per question" : "Per quiz"}
                    </div>
                    <h2 className="mt-3 text-lg font-bold text-foreground">{quiz.title}</h2>
                  </div>
                  <span className="rounded-full border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-muted">
                    {quiz._count.sessions} sessions
                  </span>
                </div>

                <p className="mt-3 min-h-[40px] text-sm leading-6 text-muted">
                  {quiz.description || "No description added yet."}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted">
                  <span className="rounded-full border border-border bg-surface px-2 py-1">{quiz._count.questions} questions</span>
                  <span className="rounded-full border border-border bg-surface px-2 py-1">{formatDuration(quiz.duration)}</span>
                  <span className="rounded-full border border-border bg-surface px-2 py-1">
                    {new Date(quiz.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-2 pt-3">
                  <Link
                    href={`/teacher/quiz/${quiz.id}`}
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/30 hover:text-primary"
                  >
                    Open
                  </Link>
                  <Link
                    href={`/teacher/quiz/${quiz.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Edit
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
