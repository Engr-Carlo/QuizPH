"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { CoverArt } from "@/components/dashboard/CoverArt";
import {
  IconChevronRight,
  IconClock,
  IconPlus,
  IconQuestion,
  PageHeader,
  buttonPrimary,
} from "@/components/dashboard/primitives";

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
    return quizzes.filter((quiz) => `${quiz.title} ${quiz.description ?? ""}`.toLowerCase().includes(query));
  }, [quizzes, search]);

  const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz._count.questions, 0);
  const totalSessions = quizzes.reduce((sum, quiz) => sum + quiz._count.sessions, 0);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="My quizzes"
          description={`${quizzes.length} quiz${quizzes.length === 1 ? "" : "zes"} · ${totalQuestions} question${totalQuestions === 1 ? "" : "s"} · ${totalSessions} session${totalSessions === 1 ? "" : "s"} run`}
          actions={
            <Link href="/teacher/quiz/create" className={buttonPrimary}>
              <IconPlus />
              Create quiz
            </Link>
          }
        />

        <div className="relative max-w-md">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <label className="sr-only" htmlFor="quiz-search">Search quizzes</label>
          <input
            id="quiz-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title or description"
            className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-72 animate-pulse rounded-xl border border-border bg-white" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
            <h2 className="text-base font-semibold text-foreground">
              {quizzes.length === 0 ? "No quizzes yet" : "No quizzes match your search"}
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              {quizzes.length === 0 ? "Create your first quiz to get started." : "Try another keyword."}
            </p>
            {quizzes.length === 0 && (
              <Link href="/teacher/quiz/create" className={`${buttonPrimary} mt-5`}>
                <IconPlus />
                Create quiz
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredQuizzes.map((quiz) => (
              <article
                key={quiz.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <Link href={`/teacher/quiz/${quiz.id}`} className="block">
                  <CoverArt seed={quiz.id} className="h-32">
                    <span className="absolute left-4 top-4 rounded-md bg-black/30 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                      {quiz.timerType === "PER_QUESTION" ? "Timer per question" : "Timer per quiz"}
                    </span>
                    <span className="absolute bottom-3 right-4 text-4xl font-semibold tabular-nums leading-none text-white/25">
                      {String(quiz._count.questions).padStart(2, "0")}
                    </span>
                  </CoverArt>
                </Link>

                <div className="flex flex-1 flex-col p-5">
                  <Link href={`/teacher/quiz/${quiz.id}`}>
                    <h2 className="line-clamp-1 text-base font-semibold text-foreground transition group-hover:text-primary">
                      {quiz.title}
                    </h2>
                  </Link>
                  <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-muted">
                    {quiz.description || "No description added yet."}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <IconQuestion />
                      {quiz._count.questions} questions
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <IconClock />
                      {formatDuration(quiz.duration)}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-3.5">
                    <span className="text-xs text-muted">
                      <span className="font-semibold text-foreground">{quiz._count.sessions}</span> session
                      {quiz._count.sessions === 1 ? "" : "s"} ·{" "}
                      {new Date(quiz.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <Link
                      href={`/teacher/quiz/${quiz.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Open
                      <IconChevronRight />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
