"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getPusherClient } from "@/lib/pusher-client";
import Link from "next/link";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    questions: { id: string }[];
    duration: number;
    timerType: string;
  };
  participants: Participant[];
}

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const VIOLATION_META: Record<string, { label: string; short: string; color: string; bg: string }> = {
  FULLSCREEN_EXIT: { label: "Fullscreen Exit", short: "Fullscrn", color: "text-danger", bg: "bg-danger/10" },
  TAB_SWITCH:      { label: "Tab Switch",      short: "Tab Sw",  color: "text-warning", bg: "bg-warning/10" },
  RIGHT_CLICK:     { label: "Right Click",     short: "R-Click", color: "text-accent",  bg: "bg-accent/10" },
  DEVTOOLS:        { label: "DevTools",         short: "DevTool", color: "text-danger",  bg: "bg-danger/10" },
  COPY_PASTE:      { label: "Copy / Paste",    short: "C/Paste", color: "text-warning", bg: "bg-warning/10" },
};

const AVATAR_COLORS = ["bg-primary", "bg-secondary", "bg-accent", "bg-success", "bg-warning"];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function MonitorPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const quizId = params.id as string;

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ViolationEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"participants" | "leaderboard">("participants");

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
    ch.bind("participant-joined", fetchSession);
    ch.bind("answer-submitted", fetchSession);
    ch.bind("participant-finished", fetchSession);
    return () => { ch.unbind_all(); pusher.unsubscribe(`session-${sessionId}`); };
  }, [sessionId, fetchSession]);

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((p) => p.slice(0, -1)), 5000);
    return () => clearTimeout(t);
  }, [toasts]);

  // â”€â”€ Loading / not found â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Loading monitorâ€¦</p>
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

  const totalQ = sessionData.quiz.questions.length;
  const selectedP = sessionData.participants.find((p) => p.id === selectedId);
  const finished = sessionData.participants.filter((p) => p.isFinished).length;
  const withViolations = sessionData.participants.filter((p) => p.violations.length > 0).length;

  // Leaderboard: sort by score desc, then violations asc
  const leaderboard = [...sessionData.participants].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.violations.length - b.violations.length;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* â”€â”€ Top header â”€â”€ */}
      <header className="bg-card border-b border-border px-6 py-3.5 flex items-center justify-between flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href={`/teacher/quiz/${quizId}`}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition"
          >
            â† Back
          </Link>
          <div className="h-4 w-px bg-border" />
          <div>
            <h1 className="font-extrabold text-foreground">{sessionData.quiz.title}</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="font-mono font-extrabold text-primary text-sm tracking-widest">
                {sessionData.code}
              </span>
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

      {/* â”€â”€ Body â”€â”€ */}
      <div className="flex flex-1 overflow-hidden">

        {/* â”€â”€ Main panel â”€â”€ */}
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
                {tab === "participants" ? `Participants (${sessionData.participants.length})` : "ðŸ† Leaderboard"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto p-5">

            {/* â”€â”€ Participants tab â”€â”€ */}
            {activeTab === "participants" && (
              sessionData.participants.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-4xl mb-3">â³</div>
                    <p className="text-muted text-sm">Waiting for students to joinâ€¦</p>
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

                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                        className={`bg-card border rounded-2xl p-4 text-left transition hover:shadow-md ${
                          selectedId === p.id
                            ? "border-primary ring-2 ring-primary/20 shadow-md"
                            : vCount > 0
                            ? "border-danger/40"
                            : "border-border"
                        }`}
                      >
                        {/* Avatar + name */}
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(p.user.name)}`}>
                            {getInitials(p.user.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{p.user.name}</p>
                            {p.isFinished && (
                              <span className="text-[10px] font-semibold text-success">âœ“ Done</span>
                            )}
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-[10px] text-muted mb-1">
                            <span>{p.answers.length}/{totalQ} answered</span>
                            <span className="font-semibold text-primary">{p.score} pts</span>
                          </div>
                          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Violation badges */}
                        {vCount > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(
                              p.violations.reduce<Record<string, number>>((acc, v) => {
                                acc[v.type] = (acc[v.type] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([type, cnt]) => (
                              <span
                                key={type}
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${VIOLATION_META[type]?.bg} ${VIOLATION_META[type]?.color}`}
                                title={VIOLATION_META[type]?.label}
                              >
                                {VIOLATION_META[type]?.short} Ã—{cnt}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-success font-semibold">âœ“ Clean</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {/* â”€â”€ Leaderboard tab â”€â”€ */}
            {activeTab === "leaderboard" && (
              <div className="max-w-2xl mx-auto space-y-2">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-16 text-muted text-sm">
                    No participants yet.
                  </div>
                ) : (
                  leaderboard.map((p, rank) => {
                    const medals = ["ðŸ¥‡", "ðŸ¥ˆ", "ðŸ¥‰"];
                    const progress = totalQ > 0 ? (p.score / totalQ) * 100 : 0;
                    return (
                      <div
                        key={p.id}
                        className={`bg-card border rounded-2xl px-5 py-3.5 flex items-center gap-4 ${
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
                            <span className="text-sm font-extrabold text-primary ml-2">{p.score} pts</span>
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
                        {p.violations.length > 0 && (
                          <span className="text-xs text-danger font-semibold flex-shrink-0">
                            âš  {p.violations.length}
                          </span>
                        )}
                        {p.isFinished && (
                          <span className="text-[10px] text-success font-bold flex-shrink-0">âœ“ Done</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* â”€â”€ Detail sidebar â”€â”€ */}
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
                    <span className="font-extrabold text-danger text-xs">{cnt}Ã—</span>
                  </div>
                ))}
                {selectedP.violations.length === 0 && (
                  <p className="text-xs text-success font-semibold">âœ“ No violations recorded</p>
                )}
              </div>

              {/* Timeline */}
              {selectedP.violations.length > 0 && (
                <>
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
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center">
                <div className="text-3xl mb-2">ðŸ‘†</div>
                <p className="text-sm text-muted">Click a participant card to see their details</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* â”€â”€ Toast notifications â”€â”€ */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast, i) => (
          <div
            key={i}
            className="toast-enter bg-card border border-danger/40 rounded-xl p-3.5 shadow-lg max-w-[280px]"
          >
            <div className="flex items-start gap-2.5">
              <span className="text-danger text-lg flex-shrink-0">âš ï¸</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{toast.participantName}</p>
                <p className="text-xs text-muted mt-0.5">
                  {VIOLATION_META[toast.type]?.label || toast.type}
                  <span className="ml-1 text-danger font-semibold">(Total: {toast.totalCount})</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


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
    questions: { id: string }[];
    duration: number;
    timerType: string;
  };
  participants: Participant[];
}
