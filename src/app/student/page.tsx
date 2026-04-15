"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { getAvatarUrl, normalizeAvatarId } from "@/lib/avatar-presets";

interface HistoryEntry {
  id: string;
  score: number;
  isFinished: boolean;
  joinedAt: string;
  _count: { violations: number };
  session: {
    id: string;
    code: string;
    status: string;
    endedAt: string | null;
    quiz: { title: string; activeQuestionCount: number };
  };
}

const RULES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    title: "Fullscreen Required",
    desc: "The quiz will launch in fullscreen. Exiting will be logged.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
    title: "No Tab Switching",
    desc: "Switching to another tab or window is detected and reported.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>
      </svg>
    ),
    title: "Copy-Paste Disabled",
    desc: "Copy-paste shortcuts are blocked during the quiz.",
  },
];

export default function StudentDashboard() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] || "Student";
  const currentAvatar = normalizeAvatarId(session?.user?.avatar);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    fetch("/api/student/sessions")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setHistory(data); })
      .catch(() => {});
  }, []);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Profile card */}
        <section className="rounded-[28px] border border-border/70 bg-white shadow-sm overflow-hidden">
          <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #2563EB, #0891B2)" }} />
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <img
                src={getAvatarUrl(currentAvatar)}
                alt="Your avatar"
                className="h-14 w-14 rounded-full border-2 border-border bg-surface flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{session?.user?.name}</p>
                <p className="text-xs text-muted truncate">{session?.user?.email}</p>
              </div>
              <Link
                href="/settings"
                className="flex-shrink-0 rounded-2xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary transition"
              >
                Settings
              </Link>
            </div>
          </div>
        </section>

        {/* ── Action hero ── */}
        <section className="relative overflow-hidden rounded-2xl shadow-xl" style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 45%, #0369a1 100%)" }}>
          {/* Decorative orbs */}
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl" style={{ background: "rgba(255,255,255,0.07)" }} />
          <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full blur-2xl" style={{ background: "rgba(6,182,212,0.15)" }} />
          <div className="relative px-6 py-7 sm:px-8 sm:py-9">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-lg">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-2">Student space</p>
                <h1 className="text-3xl sm:text-4xl font-black text-white leading-[1.05] tracking-tight">
                  Ready, {firstName}?
                </h1>
                <p className="mt-2.5 text-sm text-white/55 leading-relaxed">
                  Enter a 6-character session code to join your teacher&apos;s live quiz.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/student/join"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-blue-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Join a Quiz
                  </Link>
                  <span className="text-xs text-white/40 font-medium sm:pl-1">Fullscreen &middot; Anti-cheat &middot; Mobile-ready</span>
                </div>
              </div>

              {/* Real stats from history — only shown if we have history */}
              {history.length > 0 ? (
                <div className="flex gap-3 lg:flex-col lg:gap-2 flex-shrink-0">
                  {(() => {
                    const finished = history.filter(e => e.isFinished);
                    const avgPct = finished.length > 0
                      ? Math.round(finished.reduce((s, e) => s + (e.session.quiz.activeQuestionCount > 0 ? (e.score / e.session.quiz.activeQuestionCount) * 100 : 0), 0) / finished.length)
                      : null;
                    return [
                      { label: "Sessions joined", value: history.length },
                      { label: "Completed", value: finished.length },
                      ...(avgPct !== null ? [{ label: "Avg score", value: `${avgPct}%` }] : []),
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl border border-white/12 bg-white/8 backdrop-blur-sm px-4 py-3 min-w-[90px] lg:min-w-0 text-center">
                        <div className="text-2xl font-black text-white tabular-nums leading-none">{value}</div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40 mt-1">{label}</div>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div className="flex-shrink-0 rounded-xl border border-white/12 bg-white/6 backdrop-blur-sm px-5 py-4 max-w-[200px]">
                  <div className="text-2xl mb-1">🎓</div>
                  <p className="text-xs font-bold text-white/80 leading-snug">No sessions yet</p>
                  <p className="text-[11px] text-white/40 mt-1">Join your first quiz to see your stats here.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-sm font-bold text-foreground">Before you start</h2>
                <p className="text-xs text-muted mt-0.5">What to keep in mind</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-lg bg-warning/8 px-2.5 py-1 text-[11px] font-bold text-warning">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Live monitoring
              </span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {RULES.map(({ icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-border/50 bg-surface/50 p-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-primary">
                    {icon}
                  </span>
                  <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-bold text-foreground mb-0.5">What to expect</h2>
            <p className="text-xs text-muted mb-5">On mobile, it&apos;s even better</p>
            <div className="space-y-2.5">
              {[
                { n: "01", text: "Timer and progress stay visible throughout." },
                { n: "02", text: "Large tap targets — easy one-hand navigation." },
                { n: "03", text: "Controls pinned near your thumb for speed." },
              ].map(({ n, text }) => (
                <div key={n} className="flex items-start gap-3 rounded-xl bg-surface/60 px-3.5 py-3">
                  <span className="text-[10px] font-black text-primary/60 w-5 flex-shrink-0 mt-0.5 tabular-nums">{n}</span>
                  <p className="text-xs leading-5 text-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quiz History */}
        {history.length > 0 && (
          <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground">Recent Sessions</h2>
                <p className="text-xs text-muted mt-0.5">{history.length} session{history.length !== 1 ? "s" : ""} joined</p>
              </div>
            </div>
            <div className="space-y-2">
              {history.map((entry) => {
                const total = entry.session.quiz.activeQuestionCount;
                const pct = total > 0 ? Math.round((entry.score / total) * 100) : 0;
                const isActive = entry.session.status === "ACTIVE";
                const canRejoin = isActive && !entry.isFinished;
                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-border/50 bg-surface/40 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-foreground truncate">{entry.session.quiz.title}</p>
                        <p className="text-xs text-muted mt-0.5">
                          <span className="font-mono font-semibold text-foreground/60">{entry.session.code}</span>
                          {entry.isFinished && <> &middot; {entry.score}/{total} correct</>}
                          {entry._count.violations > 0 && (
                            <span className="ml-1.5 text-danger font-semibold">{entry._count.violations} violation{entry._count.violations !== 1 ? "s" : ""}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {entry.isFinished ? (
                          <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-success/8 text-success">
                            {pct}%
                          </span>
                        ) : canRejoin ? (
                          <Link
                            href={`/student/quiz/${entry.session.id}?participantId=${entry.id}`}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-success/10 text-success border border-success/20 hover:bg-success/20 transition"
                          >
                            Rejoin
                          </Link>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-muted/8 text-muted">
                            {entry.session.status === "ENDED" ? "Missed" : "Waiting"}
                          </span>
                        )}
                      </div>
                    </div>
                    {entry.isFinished && total > 0 && (
                      <div className="mt-2.5 h-1 rounded-full bg-border/50 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: pct >= 70 ? "#059669" : pct >= 40 ? "#D97706" : "#DC2626" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
