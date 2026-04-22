"use client";

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { getPusherClient } from "@/lib/pusher-client";
import { formatTime } from "@/lib/utils";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────
interface ViolationEvent {
  participantId: string;
  participantName: string;
  type: string;
  totalCount: number;
  typeCounts: { type: string; count: number }[];
  timestamp: string;
}

interface Participant {
  id: string;
  score: number;
  isFinished: boolean;
  timeLeft: number;
  timerEndsAt: string | null;
  user: { name: string; email: string };
  violations: { type: string; timestamp: string }[];
  answers: { isCorrect: boolean }[];
}

interface SessionData {
  id: string;
  code: string;
  status: string;
  quiz: {
    title: string;
    activeQuestionCount: number;
    questions: { id: string }[];
    duration: number;
    timerType: string;
  };
  participants: Participant[];
}

// ── Constants ──────────────────────────────────────────────────────────────
const VIOLATION_META: Record<string, { label: string; short: string; color: string; bg: string }> = {
  FULLSCREEN_EXIT:    { label: "Fullscreen Exit",    short: "Fullscrn",  color: "text-danger",  bg: "bg-danger/10" },
  TAB_SWITCH:         { label: "Tab Switch",         short: "Tab Sw",    color: "text-warning", bg: "bg-warning/10" },
  RIGHT_CLICK:        { label: "Right Click",        short: "R-Click",   color: "text-accent",  bg: "bg-accent/10" },
  DEVTOOLS:           { label: "DevTools",            short: "DevTool",   color: "text-danger",  bg: "bg-danger/10" },
  COPY_PASTE:         { label: "Copy / Paste",       short: "C/Paste",   color: "text-warning", bg: "bg-warning/10" },
  SCREENSHOT_ATTEMPT: { label: "Screenshot Attempt", short: "Scrnshot",  color: "text-danger",  bg: "bg-danger/10" },
};

const AVATAR_COLORS = ["bg-primary", "bg-secondary", "bg-accent", "bg-success", "bg-warning"];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

function getLiveTimeLeft(participant: Participant) {
  if (participant.isFinished) {
    return 0;
  }

  if (!participant.timerEndsAt) {
    return participant.timeLeft;
  }

  return Math.max(0, Math.ceil((new Date(participant.timerEndsAt).getTime() - Date.now()) / 1000));
}

// ── Component ──────────────────────────────────────────────────────────────
export default function MonitorPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const quizId = params.id as string;

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ViolationEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"participants" | "leaderboard">("participants");
  const [, setNow] = useState(() => Date.now());
  const [codeCopied, setCodeCopied] = useState(false);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [newlyJoinedIds, setNewlyJoinedIds] = useState<Set<string>>(new Set());
  const leaderboardItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const previousLeaderboardPositionsRef = useRef<Record<string, number>>({});

  function copySessionCode(code: string) {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  async function startQuiz() {
    if (startingQuiz) return;
    setStartingQuiz(true);
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      // fetchSession will be triggered automatically by the Pusher session-status event
    } catch {
      setStartingQuiz(false);
    }
  }

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (res.ok) setSessionData(await res.json());
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  useEffect(() => {
    const pusher = getPusherClient();
    const ch = pusher.subscribe(`session-${sessionId}`);
    ch.bind("violation", (data: ViolationEvent) => {
      setToasts((prev) => [data, ...prev].slice(0, 8));
      fetchSession();
    });
    ch.bind("session-status", () => {
      setStartingQuiz(false);
      fetchSession();
    });
    ch.bind("participant-joined", (data: { participantId: string }) => {
      setNewlyJoinedIds((prev) => new Set([...prev, data.participantId]));
      setTimeout(() => {
        setNewlyJoinedIds((prev) => {
          const next = new Set(prev);
          next.delete(data.participantId);
          return next;
        });
      }, 3000);
      fetchSession();
    });
    ch.bind("answer-submitted", fetchSession);
    ch.bind("participant-finished", fetchSession);
    return () => { ch.unbind_all(); pusher.unsubscribe(`session-${sessionId}`); };
  }, [sessionId, fetchSession]);

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((p) => p.slice(0, -1)), 5000);
    return () => clearTimeout(t);
  }, [toasts]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Re-fetch when the browser tab regains focus (catches missed Pusher events)
  useEffect(() => {
    const handleVisible = () => { if (!document.hidden) fetchSession(); };
    document.addEventListener("visibilitychange", handleVisible);
    return () => document.removeEventListener("visibilitychange", handleVisible);
  }, [fetchSession]);

  const totalQ = sessionData?.quiz.activeQuestionCount ?? 0;
  const selectedP = sessionData?.participants.find((p) => p.id === selectedId) ?? null;
  const finished = sessionData?.participants.filter((p) => p.isFinished).length ?? 0;
  const withViolations = sessionData?.participants.filter((p) => p.violations.length > 0).length ?? 0;

  // Leaderboard: sort by score desc, then violations asc
  const leaderboard = sessionData
    ? [...sessionData.participants].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.violations.length - b.violations.length;
      })
    : [];

  const leaderboardSignature = leaderboard
    .map((participant) => `${participant.id}:${participant.score}:${participant.violations.length}`)
    .join("|");

  useLayoutEffect(() => {
    if (!sessionData || activeTab !== "leaderboard") {
      previousLeaderboardPositionsRef.current = {};
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nextPositions: Record<string, number> = {};

    leaderboard.forEach((participant) => {
      const element = leaderboardItemRefs.current[participant.id];
      if (!element) return;

      const nextTop = element.getBoundingClientRect().top;
      nextPositions[participant.id] = nextTop;

      if (prefersReducedMotion) return;

      const previousTop = previousLeaderboardPositionsRef.current[participant.id];
      if (previousTop === undefined) return;

      const deltaY = previousTop - nextTop;
      if (Math.abs(deltaY) < 1) return;

      const isOvertaking = deltaY > 0; // card moved up = overtook someone

      element.animate(
        isOvertaking
          ? [
              {
                transform: `translateY(${deltaY}px) scale(0.95)`,
                boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                zIndex: 10,
              },
              {
                offset: 0.32,
                transform: `translateY(${deltaY * 0.22}px) scale(1.08)`,
                boxShadow:
                  "0 0 55px 16px rgba(234,179,8,0.60), 0 30px 70px rgba(234,179,8,0.32)",
                zIndex: 10,
              },
              {
                offset: 0.70,
                transform: "translateY(0) scale(1.03)",
                boxShadow:
                  "0 0 30px 8px rgba(234,179,8,0.30), 0 12px 32px rgba(234,179,8,0.14)",
                zIndex: 5,
              },
              {
                transform: "translateY(0) scale(1)",
                boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                zIndex: 1,
              },
            ]
          : [
              {
                transform: `translateY(${deltaY}px) scale(1.01)`,
                boxShadow: "0 18px 40px rgba(37,99,235,0.14)",
                zIndex: 2,
              },
              {
                transform: "translateY(0) scale(1)",
                boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
                zIndex: 1,
              },
            ],
        {
          duration: isOvertaking ? 980 : 750,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "none",
        }
      );

      // Inject rank-up glow class + floating badge for overtaking cards
      if (isOvertaking) {
        element.classList.add("rank-overtake");
        const badge = document.createElement("div");
        badge.className = "rank-badge-up";
        badge.textContent = "↑ Rank Up!";
        element.appendChild(badge);
        setTimeout(() => {
          element.classList.remove("rank-overtake");
          if (badge.parentNode === element) element.removeChild(badge);
        }, 1400);
      }
    });

    previousLeaderboardPositionsRef.current = nextPositions;
  }, [activeTab, leaderboard, leaderboardSignature, sessionData]);

  // ── Loading / not found ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Loading monitor...</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Session not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Top header ── */}
      <header className="bg-card border-b border-border px-6 py-3.5 flex items-center justify-between flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href={`/teacher/quiz/${quizId}`}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition"
          >
            Back
          </Link>
          <div className="h-4 w-px bg-border" />
          <div>
            <h1 className="font-extrabold text-foreground">{sessionData.quiz.title}</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <button
                type="button"
                onClick={() => copySessionCode(sessionData.code)}
                className="font-mono font-extrabold text-primary text-sm tracking-widest hover:text-primary/70 transition flex items-center gap-1.5"
                title="Click to copy session code"
              >
                {sessionData.code}
                <span className="text-[11px] font-sans font-normal text-muted">
                  {codeCopied ? "Copied!" : "copy"}
                </span>
              </button>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  sessionData.status === "ACTIVE"
                    ? "bg-success/12 text-success border border-success/25"
                    : "bg-muted/12 text-muted border border-muted/20"
                }`}
              >
                {sessionData.status}
              </span>
            </div>
          </div>
        </div>

        {/* Live stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <div className="text-lg font-extrabold text-foreground">{sessionData.participants.length}</div>
            <div className="text-[11px] text-muted">Participants</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-extrabold text-success">{finished}</div>
            <div className="text-[11px] text-muted">Finished</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-extrabold text-danger">{withViolations}</div>
            <div className="text-[11px] text-muted">Violations</div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-success">
            <span className="w-2 h-2 rounded-full bg-success pulse-dot" />
            LIVE
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── WAITING LOBBY ── */}
        {sessionData.status === "WAITING" && (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Lobby top bar */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-card flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Live count badge */}
                <div className="flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-2xl px-4 py-2">
                  <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />
                  <span className="text-sm font-extrabold text-primary">
                    {sessionData.participants.length} waiting
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted">Share this code with your students</p>
                  <button
                    type="button"
                    onClick={() => copySessionCode(sessionData.code)}
                    className="font-mono font-black text-2xl tracking-[0.25em] text-primary hover:text-primary/70 transition flex items-center gap-2 leading-none mt-0.5"
                  >
                    {sessionData.code}
                    <span className="text-[11px] font-sans font-normal text-muted normal-case tracking-normal">
                      {codeCopied ? "Copied!" : "copy"}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={startQuiz}
                disabled={startingQuiz || sessionData.participants.length === 0}
                className="flex items-center gap-2 bg-primary text-white font-bold px-5 py-2.5 rounded-xl hover:bg-primary/90 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
              >
                {startingQuiz ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Start Quiz
                  </>
                )}
              </button>
            </div>

            {/* Student roster */}
            <div className="flex-1 overflow-auto p-6">
              {sessionData.participants.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/8 border-2 border-dashed border-primary/25 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/50">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">No students yet</p>
                    <p className="text-sm text-muted mt-1">
                      Ask your students to go to the quiz and enter code{" "}
                      <span className="font-mono font-bold text-primary">{sessionData.code}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-4">
                    Students in lobby — {sessionData.participants.length}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {sessionData.participants.map((p) => (
                      <div
                        key={p.id}
                        className={`bg-card border rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center transition-shadow hover:shadow-md ${
                          newlyJoinedIds.has(p.id)
                            ? "border-primary/50 ring-2 ring-primary/20 lobby-pop"
                            : "border-border"
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold ${avatarColor(p.user.name)}`}>
                          {getInitials(p.user.name)}
                        </div>
                        <p className="text-xs font-semibold text-foreground leading-tight break-words w-full">{p.user.name}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Ready
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ACTIVE / ENDED — normal monitor panels ── */}
        {sessionData.status !== "WAITING" && (
        <div className="contents">
        {/* ── Main panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-border bg-card px-6 gap-6 flex-shrink-0">
            {(["participants", "leaderboard"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-semibold capitalize border-b-2 transition -mb-px ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {tab === "participants" ? `Participants (${sessionData.participants.length})` : "Leaderboard"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto p-5">

            {/* ── Participants tab ── */}
            {activeTab === "participants" && (
              sessionData.participants.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-10 h-10 border-2 border-border rounded-full mx-auto mb-3 flex items-center justify-center text-muted">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <p className="text-muted text-sm">Waiting for students to join...</p>
                    <p className="text-xs text-muted mt-1">
                      Share the code <span className="font-mono font-bold text-primary">{sessionData.code}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {sessionData.participants.map((p) => {
                    const vCount = p.violations.length;
                    const progress = totalQ > 0 ? (p.answers.length / totalQ) * 100 : 0;
                    const timeLeft = getLiveTimeLeft(p);

                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                        className={`border rounded-2xl p-4 text-left transition hover:shadow-md ${
                          selectedId === p.id
                            ? "bg-card border-primary ring-2 ring-primary/20 shadow-md"
                            : vCount > 0
                            ? "bg-danger/5 border-danger/50 ring-1 ring-danger/20"
                            : "bg-card border-border"
                        }`}
                      >
                        {/* ALERT banner for students with violations */}
                        {vCount > 0 && (
                          <div className="flex items-center gap-1.5 mb-2.5 px-2 py-1 rounded-lg bg-danger/15 border border-danger/30">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-danger flex-shrink-0">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                            <span className="text-[10px] font-black text-danger uppercase tracking-wide">⚠ Alert — {vCount} violation{vCount > 1 ? "s" : ""}</span>
                          </div>
                        )}
                        {/* Avatar + name */}
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(p.user.name)}`}>
                            {getInitials(p.user.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{p.user.name}</p>
                            {p.isFinished && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                Done
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-[10px] text-muted mb-1">
                            <span>{p.answers.length}/{totalQ} answered</span>
                            <span key={p.score} className="score-bump font-semibold text-primary">{p.score} pts</span>
                          </div>
                          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-muted">
                          <span>Time left</span>
                          <span className={timeLeft <= 60 && !p.isFinished ? "text-danger" : "text-foreground"}>
                            {p.isFinished ? "Done" : formatTime(timeLeft)}
                          </span>
                        </div>

                        {/* Violation badges */}
                        {vCount > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {Object.entries(
                              p.violations.reduce<Record<string, number>>((acc, v) => {
                                acc[v.type] = (acc[v.type] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([type, cnt]) => (
                              <span
                                key={type}
                                className={`text-xs font-bold px-2 py-0.5 rounded-full border ${VIOLATION_META[type]?.bg} ${VIOLATION_META[type]?.color} border-current/20`}
                                title={VIOLATION_META[type]?.label}
                              >
                                {VIOLATION_META[type]?.short} ×{cnt}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-success font-semibold">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Clean
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {/* ── Leaderboard tab ── */}
            {activeTab === "leaderboard" && (
              <div className="max-w-2xl mx-auto space-y-2">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-16 text-muted text-sm">
                    No participants yet.
                  </div>
                ) : (
                  leaderboard.map((p, rank) => {
                    const medals = ["1st", "2nd", "3rd"];
                    const progress = totalQ > 0 ? (p.score / totalQ) * 100 : 0;
                    const timeLeft = getLiveTimeLeft(p);
                    return (
                      <div
                        key={p.id}
                        ref={(element) => {
                          leaderboardItemRefs.current[p.id] = element;
                        }}
                        className={`relative bg-card border rounded-2xl px-5 py-3.5 flex items-center gap-4 transition-all duration-500 ${
                          rank === 0 ? "border-warning/40 shadow-sm" : "border-border"
                        }`}
                      >
                        <span className="text-xl w-8 text-center flex-shrink-0">
                          {rank < 3 ? medals[rank] : <span className="text-sm font-bold text-muted">#{rank + 1}</span>}
                        </span>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarColor(p.user.name)}`}>
                          {getInitials(p.user.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-foreground truncate">{p.user.name}</p>
                            <span key={p.score} className="score-bump text-sm font-extrabold text-primary ml-2">{p.score} pts</span>
                          </div>
                          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${progress}%`,
                                background: rank === 0 ? "var(--warning)" : "var(--primary)",
                              }}
                            />
                          </div>
                        </div>
                        <span className={`text-xs font-bold flex-shrink-0 ${timeLeft <= 60 && !p.isFinished ? "text-danger" : "text-muted"}`}>
                          {p.isFinished ? "Done" : formatTime(timeLeft)}
                        </span>
                        {p.violations.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-danger font-semibold flex-shrink-0">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                              <line x1="12" y1="9" x2="12" y2="13"/>
                              <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                            {p.violations.length}
                          </span>
                        )}
                        {p.isFinished && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-success font-bold flex-shrink-0">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Done
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Detail sidebar ── */}
        <aside className="w-72 border-l border-border bg-card overflow-y-auto flex-shrink-0">
          {selectedP ? (
            <div className="p-5">
              {/* Participant header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${avatarColor(selectedP.user.name)}`}>
                  {getInitials(selectedP.user.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-foreground truncate">{selectedP.user.name}</p>
                  <p className="text-xs text-muted truncate">{selectedP.user.email}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2.5 mb-5">
                {[
                  { label: "Score", value: selectedP.score, color: "text-primary", bg: "bg-primary/8" },
                  { label: "Answers", value: `${selectedP.answers.length}/${totalQ}`, color: "text-foreground", bg: "bg-surface" },
                  { label: "Violations", value: selectedP.violations.length, color: "text-danger", bg: "bg-danger/8" },
                  { label: "Time Left", value: selectedP.isFinished ? "Done" : formatTime(getLiveTimeLeft(selectedP)), color: getLiveTimeLeft(selectedP) <= 60 && !selectedP.isFinished ? "text-danger" : "text-foreground", bg: getLiveTimeLeft(selectedP) <= 60 && !selectedP.isFinished ? "bg-danger/8" : "bg-surface" },
                  { label: "Status", value: selectedP.isFinished ? "Done" : "Active", color: selectedP.isFinished ? "text-success" : "text-warning", bg: selectedP.isFinished ? "bg-success/8" : "bg-warning/8" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                    <div className={`text-lg font-extrabold ${color}`}>{value}</div>
                    <div className="text-[10px] text-muted">{label}</div>
                  </div>
                ))}
              </div>

              {/* Violation breakdown */}
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-2.5">Violation Breakdown</h4>
              <div className="space-y-1.5 mb-5">
                {Object.entries(
                  selectedP.violations.reduce<Record<string, number>>((acc, v) => {
                    acc[v.type] = (acc[v.type] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([type, cnt]) => (
                  <div key={type} className="flex items-center justify-between text-sm bg-surface rounded-lg px-3 py-2">
                    <span className={`font-medium text-xs ${VIOLATION_META[type]?.color}`}>
                      {VIOLATION_META[type]?.label || type}
                    </span>
                    <span className="font-extrabold text-danger text-xs">{cnt}x</span>
                  </div>
                ))}
                {selectedP.violations.length === 0 && (
                  <p className="inline-flex items-center gap-1 text-xs text-success font-semibold">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    No violations recorded
                  </p>
                )}
              </div>

              {/* Timeline */}
              {selectedP.violations.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-2.5">Timeline</h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {[...selectedP.violations]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((v, i) => (
                        <div key={i} className={`flex items-start gap-2.5 text-xs border-l-2 pl-3 py-1 ${VIOLATION_META[v.type]?.color ? "border-danger" : "border-muted"}`}>
                          <div className="flex-1">
                            <p className={`font-semibold ${VIOLATION_META[v.type]?.color}`}>
                              {VIOLATION_META[v.type]?.label || v.type}
                            </p>
                            <p className="text-muted text-[10px]">
                              {new Date(v.timestamp).toLocaleTimeString("en-PH")}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">Violations Feed</h4>
              {(() => {
                const allViolations = sessionData.participants
                  .flatMap((p) =>
                    p.violations.map((v) => ({ ...v, participantName: p.user.name }))
                  )
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 40);
                return allViolations.length === 0 ? (
                  <p className="text-xs text-muted text-center py-8">No violations recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {allViolations.map((v, i) => (
                      <div key={i} className={`flex items-start gap-2.5 text-xs border-l-2 pl-3 py-1.5 ${VIOLATION_META[v.type]?.color ? "border-danger" : "border-muted"}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{v.participantName}</p>
                          <p className={`text-[11px] ${VIOLATION_META[v.type]?.color}`}>{VIOLATION_META[v.type]?.label || v.type}</p>
                          <p className="text-muted text-[10px]">{new Date(v.timestamp).toLocaleTimeString("en-PH")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <p className="text-[10px] text-muted mt-4 text-center">Click a participant card to see their details.</p>
            </div>
          )}
        </aside>
        </div>
        )}
      </div>

      {/* ── Toast notifications ── */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast, i) => (
          <div
            key={i}
            className="toast-enter bg-danger border border-danger rounded-xl p-3.5 shadow-[0_8px_30px_rgba(220,38,38,0.4)] max-w-[300px] pointer-events-auto"
          >
            <div className="flex items-start gap-2.5">
              <span className="flex-shrink-0 text-white mt-0.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </span>
              <div>
                <p className="text-xs font-black text-white/70 uppercase tracking-widest mb-0.5">⚠ Violation Alert</p>
                <p className="text-sm font-black text-white">{toast.participantName}</p>
                <p className="text-xs text-white/80 mt-0.5">
                  {VIOLATION_META[toast.type]?.label || toast.type}
                  <span className="ml-1 font-bold">— {toast.totalCount} total</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
