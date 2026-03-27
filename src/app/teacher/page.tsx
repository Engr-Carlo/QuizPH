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

const CARD_ACCENTS: [string, string][] = [
  ["#2563EB", "#4F46E5"],
  ["#059669", "#0891B2"],
  ["#7C3AED", "#9333EA"],
  ["#D97706", "#EA580C"],
  ["#0284C7", "#0369A1"],
  ["#E11D48", "#DB2777"],
];

function cardAccentStyle(id: string) {
  const sum = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const [from, to] = CARD_ACCENTS[sum % CARD_ACCENTS.length];
  return { background: `linear-gradient(135deg, ${from}, ${to})` };
}

export default function TeacherDashboard() {
  const { data: session } = useSession();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadQuizzes() {
      try {
        const res = await fetch("/api/quiz");
        const payload = await res.json().catch(() => null);
        if (!res.ok) { setError(payload?.error || "Failed to load quizzes"); setQuizzes([]); return; }
        setQuizzes(Array.isArray(payload) ? payload : []);
      } catch {
        setError("Failed to load quizzes"); setQuizzes([]);
      } finally {
        setLoading(false);
      }
    }
    loadQuizzes();
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] || "Teacher";
  const totalQuestions = quizzes.reduce((s, q) => s + q._count.questions, 0);
  const totalSessions = quizzes.reduce((s, q) => s + q._count.sessions, 0);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const filteredQuizzes = searchQuery
    ? quizzes.filter((q) => q.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : quizzes;

  return (
    <DashboardLayout>
      <div className="space-y-7">

        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{greeting}</p>
            <h1 className="text-2xl font-black text-foreground mt-0.5">{firstName}</h1>
          </div>
          <Link
            href="/teacher/quiz/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition hover:opacity-90 shadow-sm flex-shrink-0"
            style={{ background: "var(--primary)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Quiz
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-28">
            <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 px-5 py-4 text-sm text-danger">{error}</div>
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-border bg-white text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/8 text-primary flex items-center justify-center mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <h3 className="font-bold text-foreground mb-1.5">No quizzes yet</h3>
            <p className="text-muted text-sm mb-6 max-w-xs">Create your first quiz to start engaging students with live, monitored sessions.</p>
            <Link
              href="/teacher/quiz/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              Create First Quiz
            </Link>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {[
                {
                  label: "Quizzes",
                  value: quizzes.length,
                  accent: "bg-primary/10 text-primary",
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  ),
                },
                {
                  label: "Questions",
                  value: totalQuestions,
                  accent: "bg-amber-50 text-amber-600",
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  ),
                },
                {
                  label: "Sessions",
                  value: totalSessions,
                  accent: "bg-emerald-50 text-emerald-600",
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  ),
                },
              ].map(({ label, value, accent, icon }) => (
                <div key={label} className="rounded-2xl bg-white border border-border p-4 sm:p-5 shadow-sm">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl mb-3 ${accent}`}>
                    {icon}
                  </span>
                  <div className="text-3xl font-black text-foreground leading-none tabular-nums">{value}</div>
                  <div className="text-xs text-muted mt-1.5 font-medium">{label}</div>
                </div>
              ))}
            </div>

            {/* Quiz grid */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted mb-3">Your Quizzes</h2>
              <div className="mb-3">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search quizzes…"
                    className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredQuizzes.map((quiz) => (
                  <Link
                    key={quiz.id}
                    href={`/teacher/quiz/${quiz.id}`}
                    className="group rounded-2xl border border-border bg-white hover:border-primary/30 hover:shadow-md transition-all overflow-hidden block"
                  >
                    <div className="h-1.5 w-full" style={cardAccentStyle(quiz.id)} />
                    <div className="p-5">
                      <h3 className="font-bold text-sm text-foreground mb-1.5 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                        {quiz.title}
                      </h3>
                      {quiz.description ? (
                        <p className="text-muted text-xs leading-5 mb-4 line-clamp-2">{quiz.description}</p>
                      ) : (
                        <p className="text-muted/40 text-xs italic mb-4">No description</p>
                      )}
                      <div className="flex items-center gap-3 pt-3 border-t border-border/60">
                        <span className="text-xs text-muted font-medium">{quiz._count.questions} questions</span>
                        <span className="text-xs text-muted font-medium">{quiz._count.sessions} sessions</span>
                        <span className="ml-auto text-xs text-muted bg-surface px-2 py-0.5 rounded-md">{formatDuration(quiz.duration)}</span>
                      </div>
                    </div>
                  </Link>
                ))}

                {filteredQuizzes.length === 0 && searchQuery && (
                  <div className="col-span-full text-center py-10 text-muted text-sm">
                    No quizzes match &ldquo;{searchQuery}&rdquo;
                  </div>
                )}

                {/* Add new quiz slot */}
                <Link
                  href="/teacher/quiz/create"
                  className="group rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-transparent hover:bg-primary/4 transition-all flex flex-col items-center justify-center py-10 gap-2.5 min-h-[140px]"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-muted group-hover:text-primary transition-colors">New Quiz</span>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
