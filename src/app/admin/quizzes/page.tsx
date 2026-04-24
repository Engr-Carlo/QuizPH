"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface QuizData {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  teacher: { id: string; name: string; email: string };
  _count: { questions: number; sessions: number };
}

interface QuizOption { id: string; text: string; isCorrect: boolean; }
interface QuizQuestion { id: string; text: string; type: string; order: number; options: QuizOption[]; }
interface QuizDetail {
  id: string; title: string; timerType: string; duration: number;
  antiCheatEnabled: boolean; randomizeQuestions: boolean; randomizeAnswers: boolean;
  allowSkip: boolean; questionSelectionMode: string;
  questions: QuizQuestion[];
}

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<QuizData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [quizDetails, setQuizDetails] = useState<Record<string, QuizDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  async function openDetail(id: string) {
    if (quizDetails[id]) {
      setExpandedQuiz((prev) => (prev === id ? null : id));
      return;
    }
    setLoadingDetail(id);
    setExpandedQuiz(id);
    const res = await fetch(`/api/admin/quizzes/${id}`);
    if (res.ok) {
      const data: QuizDetail = await res.json();
      setQuizDetails((prev) => ({ ...prev, [id]: data }));
    }
    setLoadingDetail(null);
  }

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    const res = await fetch(`/api/admin/quizzes?${params}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setQuizzes(data.quizzes);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await fetch(`/api/admin/quizzes/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    setDeleteLoading(false);
    fetchData();
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Quizzes</h1>
          <p className="mt-1 text-sm text-muted">Browse and manage quizzes created by all teachers. {total > 0 && <span className="font-medium text-foreground">{total} total</span>}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Quiz Library</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or teacher..."
            className="w-72 rounded-lg border border-border px-3 py-1.5 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 rounded-full border-2 border-border border-t-primary animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-5 py-3">Quiz</th>
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3 text-center">Questions</th>
                  <th className="px-4 py-3 text-center">Sessions</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map((quiz) => (
                  <tr key={quiz.id} className="border-b border-border/50 transition hover:bg-surface/60 last:border-0">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-foreground">{quiz.title}</p>
                      {quiz.description && <p className="mt-0.5 text-xs text-muted line-clamp-1">{quiz.description}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-foreground">{quiz.teacher.name}</p>
                      <p className="text-xs text-muted">{quiz.teacher.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm text-muted">{quiz._count.questions}</td>
                    <td className="px-4 py-3.5 text-center text-sm text-muted">{quiz._count.sessions}</td>
                    <td className="px-4 py-3.5 text-xs text-muted">
                      {new Date(quiz.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetail(quiz.id)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-primary/30 hover:text-primary"
                        >
                          {expandedQuiz === quiz.id ? "Hide" : "Questions"}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(quiz)}
                          className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/8"
                        >
                          </button>
                      </div>
                    </td>
                  </tr>

                  {/* Quiz detail accordion */}
                  {expandedQuiz === quiz.id && (
                    <tr>
                      <td colSpan={6} className="bg-surface/60 px-5 pb-5 pt-3">
                        {loadingDetail === quiz.id ? (
                          <div className="flex items-center gap-2 py-4 text-sm text-muted">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                            Loading questions…
                          </div>
                        ) : quizDetails[quiz.id] ? (
                          <div>
                            {/* Settings strip */}
                            <div className="mb-3 flex flex-wrap gap-2">
                              {[
                                quizDetails[quiz.id].timerType === "PER_QUESTION" ? "Per-question timer" : `${Math.floor(quizDetails[quiz.id].duration / 60)}m timer`,
                                quizDetails[quiz.id].antiCheatEnabled ? "Anti-cheat ON" : "Anti-cheat off",
                                quizDetails[quiz.id].randomizeQuestions ? "Randomized questions" : null,
                                quizDetails[quiz.id].randomizeAnswers ? "Randomized answers" : null,
                                !quizDetails[quiz.id].allowSkip ? "No skip" : null,
                              ].filter(Boolean).map((tag) => (
                                <span key={tag} className="rounded-full bg-primary/8 px-2.5 py-0.5 text-[11px] font-semibold text-primary">{tag}</span>
                              ))}
                            </div>
                            {/* Questions */}
                            <div className="space-y-2">
                              {quizDetails[quiz.id].questions.map((q, idx) => (
                                <div key={q.id} className="rounded-xl border border-border bg-white p-3">
                                  <div className="flex items-start gap-2 mb-2">
                                    <span className="flex-shrink-0 rounded bg-surface px-1.5 py-0.5 text-[11px] font-bold text-muted">Q{idx + 1}</span>
                                    <span className="text-sm font-medium text-foreground">{q.text}</span>
                                    <span className="ml-auto flex-shrink-0 rounded-full bg-muted/10 px-2 py-0.5 text-[10px] font-semibold text-muted">{q.type.replace("_", " ")}</span>
                                  </div>
                                  {q.options.length > 0 && (
                                    <div className="grid grid-cols-2 gap-1 pl-7">
                                      {q.options.map((opt) => (
                                        <div key={opt.id} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${opt.isCorrect ? "bg-success/10 font-semibold text-success" : "text-muted"}`}>
                                          <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${opt.isCorrect ? "bg-success" : "bg-muted/40"}`} />
                                          {opt.text}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {quizDetails[quiz.id].questions.length === 0 && (
                                <p className="text-xs text-muted">No questions in this quiz.</p>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )}
                ))}
                {quizzes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-muted">
                      {debouncedSearch ? `No quizzes found matching "${debouncedSearch}".` : "No quizzes found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 50 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-muted">Showing {Math.min((page - 1) * 50 + 1, total)}–{Math.min(page * 50, total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-primary/30 hover:text-primary disabled:opacity-40">Prev</button>
              <button disabled={page * 50 >= total} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-primary/30 hover:text-primary disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white shadow-2xl">
            <div className="px-6 py-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
              </div>
              <h3 className="text-base font-semibold text-foreground">Delete &ldquo;{deleteTarget.title}&rdquo;?</h3>
              <p className="mt-2 text-sm text-muted">This will permanently delete the quiz, all its questions, sessions, and participant data. This cannot be undone.</p>
            </div>
            <div className="flex gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted transition hover:bg-surface">Cancel</button>
              <button onClick={handleDelete} disabled={deleteLoading} className="flex-1 rounded-lg bg-danger py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 hover:opacity-90">{deleteLoading ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
