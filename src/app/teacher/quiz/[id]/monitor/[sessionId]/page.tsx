"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getPusherClient } from "@/lib/pusher-client";
import Link from "next/link";

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

const VIOLATION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  FULLSCREEN_EXIT: { label: "Fullscreen Exit", icon: "🖥️", color: "text-danger" },
  TAB_SWITCH: { label: "Tab Switch", icon: "🔄", color: "text-warning" },
  RIGHT_CLICK: { label: "Right Click", icon: "🖱️", color: "text-accent" },
  DEVTOOLS: { label: "DevTools", icon: "🔧", color: "text-danger" },
  COPY_PASTE: { label: "Copy/Paste", icon: "📋", color: "text-warning" },
};

export default function MonitorPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ViolationEvent[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (res.ok) {
      setSessionData(await res.json());
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Real-time Pusher subscriptions
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`session-${sessionId}`);

    channel.bind("violation", (data: ViolationEvent) => {
      // Add toast notification
      setToasts((prev) => [data, ...prev].slice(0, 10));

      // Refresh data
      fetchSession();
    });

    channel.bind("participant-joined", () => {
      fetchSession();
    });

    channel.bind("answer-submitted", () => {
      fetchSession();
    });

    channel.bind("participant-finished", () => {
      fetchSession();
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`session-${sessionId}`);
    };
  }, [sessionId, fetchSession]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(0, -1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [toasts]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        Loading monitor...
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Session not found
      </div>
    );
  }

  const totalQuestions = sessionData.quiz.questions.length;
  const selectedP = sessionData.participants.find(
    (p) => p.id === selectedParticipant
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/teacher/quiz/${sessionData.quiz.title}`}
            className="text-muted hover:text-foreground"
          >
            ← Back
          </Link>
          <div>
            <h1 className="font-bold text-lg">{sessionData.quiz.title}</h1>
            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="font-mono font-bold text-primary">
                {sessionData.code}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  sessionData.status === "ACTIVE"
                    ? "bg-success/20 text-success"
                    : "bg-muted/20 text-muted"
                }`}
              >
                {sessionData.status}
              </span>
              <span>{sessionData.participants.length} students</span>
            </div>
          </div>
        </div>
        <div className="text-sm text-muted">
          Live Monitor 🔴
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Participants grid */}
        <div className="flex-1 p-6 overflow-auto">
          <h2 className="font-semibold mb-4">
            Participants ({sessionData.participants.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {sessionData.participants.map((p) => {
              const violationCount = p.violations.length;
              const hasViolations = violationCount > 0;

              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedParticipant(p.id)}
                  className={`bg-card border rounded-xl p-4 text-left transition hover:shadow-md ${
                    selectedParticipant === p.id
                      ? "border-primary ring-2 ring-primary/30"
                      : hasViolations
                      ? "border-danger/50"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm truncate">
                      {p.user.name}
                    </span>
                    {p.isFinished && (
                      <span className="text-xs bg-success/20 text-success px-1.5 py-0.5 rounded">
                        Done
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted mb-2">
                    Score: {p.score}/{totalQuestions} • Answered:{" "}
                    {p.answers.length}/{totalQuestions}
                  </div>

                  {/* Violation badges */}
                  {hasViolations && (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(
                        p.violations.reduce<Record<string, number>>((acc, v) => {
                          acc[v.type] = (acc[v.type] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([type, count]) => (
                        <span
                          key={type}
                          className={`text-xs px-1.5 py-0.5 rounded-full bg-danger/10 ${
                            VIOLATION_LABELS[type]?.color || "text-danger"
                          }`}
                          title={VIOLATION_LABELS[type]?.label}
                        >
                          {VIOLATION_LABELS[type]?.icon} {count}
                        </span>
                      ))}
                    </div>
                  )}

                  {!hasViolations && (
                    <span className="text-xs text-success">✓ Clean</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <aside className="w-80 border-l border-border bg-card overflow-auto">
          {selectedP ? (
            <div className="p-4">
              <h3 className="font-bold mb-1">{selectedP.user.name}</h3>
              <p className="text-xs text-muted mb-4">{selectedP.user.email}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-background rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {selectedP.score}
                  </div>
                  <div className="text-xs text-muted">Score</div>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-danger">
                    {selectedP.violations.length}
                  </div>
                  <div className="text-xs text-muted">Violations</div>
                </div>
              </div>

              {/* Violation summary */}
              <h4 className="font-medium text-sm mb-2">Violation Breakdown</h4>
              <div className="space-y-1 mb-4">
                {Object.entries(
                  selectedP.violations.reduce<Record<string, number>>((acc, v) => {
                    acc[v.type] = (acc[v.type] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {VIOLATION_LABELS[type]?.icon}{" "}
                      {VIOLATION_LABELS[type]?.label || type}
                    </span>
                    <span className="font-medium text-danger">{count}x</span>
                  </div>
                ))}
                {selectedP.violations.length === 0 && (
                  <p className="text-sm text-success">No violations recorded</p>
                )}
              </div>

              {/* Violation timeline */}
              <h4 className="font-medium text-sm mb-2">Timeline</h4>
              <div className="space-y-2 max-h-64 overflow-auto">
                {selectedP.violations
                  .sort(
                    (a, b) =>
                      new Date(b.timestamp).getTime() -
                      new Date(a.timestamp).getTime()
                  )
                  .map((v, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs border-l-2 border-danger pl-3 py-1"
                    >
                      <span>{VIOLATION_LABELS[v.type]?.icon}</span>
                      <span className="flex-1">
                        {VIOLATION_LABELS[v.type]?.label}
                      </span>
                      <span className="text-muted">
                        {new Date(v.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-muted text-sm mt-12">
              Click on a participant to view details
            </div>
          )}
        </aside>
      </div>

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast, idx) => (
          <div
            key={idx}
            className="bg-card border border-danger/50 rounded-lg p-3 shadow-lg toast-enter max-w-xs"
          >
            <div className="flex items-center gap-2">
              <span className="text-danger">⚠️</span>
              <div>
                <p className="text-sm font-medium">{toast.participantName}</p>
                <p className="text-xs text-muted">
                  {VIOLATION_LABELS[toast.type]?.label} (Total: {toast.totalCount})
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
