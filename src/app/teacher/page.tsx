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
      <div className="mx-auto max-w-6xl space-y-5">

        {/* ── Hero banner ── */}
        <div className="relative overflow-hidden rounded-2xl min-h-[240px] sm:min-h-[268px] flex items-end shadow-2xl">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-[1.02]"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=1600&q=80')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-slate-800/30" />
          {/* Subtle grain texture overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
          <div className="relative w-full px-6 pb-7 pt-10 sm:px-8 sm:pb-9">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="max-w-md">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-2">{greeting}</p>
                <h1 className="text-4xl sm:text-5xl font-black text-white leading-[1.05] tracking-tight">
                  Hi, {firstName}.
                </h1>
                <p className="mt-3 text-sm text-white/50 font-medium">
                  {loading ? "Loading your workspace\u2026" : quizzes.length === 0 ? "Create your first quiz to get started." : `${quizzes.length} quiz${quizzes.length !== 1 ? "zes" : ""} \u00b7 ${totalQuestions} questions \u00b7 ${totalSessions} sessions run`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                {!loading && quizzes.length > 0 && (
                  <div className="flex gap-2">
                    {[
                      { label: "Quizzes", value: quizzes.length },
                      { label: "Questions", value: totalQuestions },
                      { label: "Sessions", value: totalSessions },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl bg-white/8 border border-white/12 backdrop-blur-md px-3 py-2.5 text-center min-w-[58px]">
                        <div className="text-xl font-black text-white tabular-nums leading-none">{value}</div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/45 mt-1">{label}</div>
                      </div>
                    ))}
                  </div>
                )}
                <Link
                  href="/teacher/quiz/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 text-sm font-bold rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] shadow-lg flex-shrink-0"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Quiz
                </Link>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-28">
            <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 px-5 py-4 text-sm text-danger">{error}</div>
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border bg-white text-center">
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
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground">Your Quizzes</h2>
                <p className="text-xs text-muted mt-0.5">{filteredQuizzes.length} of {quizzes.length}</p>
              </div>
              <div className="w-56">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/70" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search&hellip;"
                    className="w-full pl-8 pr-4 py-2 text-xs border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60 transition placeholder:text-muted/60"
                  />
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuizzes.map((quiz) => (
                <Link
                  key={quiz.id}
                  href={`/teacher/quiz/${quiz.id}`}
                  className="group rounded-2xl border border-border/70 bg-white hover:border-primary/25 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden block"
                >
                  <div className="h-[3px] w-full" style={cardAccentStyle(quiz.id)} />
                  <div className="p-5">
                    <h3 className="font-bold text-[14px] text-foreground mb-1.5 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                      {quiz.title}
                    </h3>
                    {quiz.description ? (
                      <p className="text-muted text-xs leading-5 mb-4 line-clamp-2">{quiz.description}</p>
                    ) : (
                      <p className="text-muted/35 text-xs italic mb-4">No description</p>
                    )}
                    <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                      <span className="text-[11px] text-muted font-medium">{quiz._count.questions}q</span>
                      <span className="text-border/80">&middot;</span>
                      <span className="text-[11px] text-muted font-medium">{quiz._count.sessions} runs</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted bg-surface px-2 py-0.5 rounded-md font-medium">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {formatDuration(quiz.duration)}
                      </span>
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
                className="group rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/40 bg-transparent hover:bg-primary/[0.03] transition-all flex flex-col items-center justify-center py-10 gap-2 min-h-[148px]"
              >
                <div className="w-9 h-9 rounded-full bg-border/40 text-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-200">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-muted/60 group-hover:text-primary transition-colors">New Quiz</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
