"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface ParticipantData {
  id: string;
  score: number;
  isFinished: boolean;
  joinedAt: string;
  user: { id: string; name: string; email: string };
}

interface AnswerData {
  id: string;
  answerText: string;
  isCorrect: boolean;
  answeredAt: string;
  question: { text: string; order: number; type: string };
}

interface SessionData {
  id: string;
  code: string;
  status: "WAITING" | "ACTIVE" | "ENDED";
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  quiz: {
    id: string;
    title: string;
    teacher: { id: string; name: string; email: string };
  };
  participants: ParticipantData[];
  _count: { participants: number; violations: number };
}

const STATUS_BADGE: Record<string, string> = {
  WAITING: "bg-warning/10 text-warning",
  ACTIVE: "bg-success/10 text-success",
  ENDED: "bg-muted/10 text-muted",
};

const STATUS_DOT: Record<string, string> = {
  WAITING: "bg-warning",
  ACTIVE: "bg-success",
  ENDED: "bg-muted",
};

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [forceEndTarget, setForceEndTarget] = useState<SessionData | null>(null);
  const [forceEndLoading, setForceEndLoading] = useState(false);

  // Answers modal
  const [answersModal, setAnswersModal] = useState<{ sessionId: string; participantId: string; participantName: string } | null>(null);
  const [answersData, setAnswersData] = useState<AnswerData[] | null>(null);
  const [answersLoading, setAnswersLoading] = useState(false);

  async function openAnswers(sessionId: string, participantId: string, participantName: string) {
    setAnswersModal({ sessionId, participantId, participantName });
    setAnswersData(null);
    setAnswersLoading(true);
    const res = await fetch(`/api/admin/sessions/${sessionId}/answers?participantId=${participantId}`);
    if (res.ok) setAnswersData(await res.json());
    setAnswersLoading(false);
  }

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/sessions?${params}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    fetchData();
    let interval = setInterval(fetchData, 30_000);

    function onVisibilityChange() {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        fetchData();
        interval = setInterval(fetchData, 30_000);
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchData]);

  async function handleForceEnd() {
    if (!forceEndTarget) return;
    setForceEndLoading(true);
    await fetch(`/api/admin/sessions/${forceEndTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "force-end" }),
    });
    setForceEndTarget(null);
    setForceEndLoading(false);
    fetchData();
  }

  const filterTabs = [
    { value: "", label: `All (${total})` },
    { value: "WAITING", label: "Waiting" },
    { value: "ACTIVE", label: "Active" },
    { value: "ENDED", label: "Ended" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Sessions</h1>
        <p className="mt-1 text-sm text-muted">Monitor all quiz sessions across the platform. View participants and force-end active sessions if needed.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">All Sessions</h2>
          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${statusFilter === tab.value ? "bg-primary text-white" : "bg-white text-muted hover:text-foreground border border-border"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 rounded-full border-2 border-border border-t-primary animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {sessions.length === 0 && (
              <p className="py-12 text-center text-sm text-muted">No sessions found.</p>
            )}
            {sessions.map((s) => {
              const isExpanded = expandedSession === s.id;
              return (
                <div key={s.id}>
                  {/* Session Row */}
                  <div className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-surface/40">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[s.status]}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s.status]}`} />
                          {s.status}
                        </span>
                        <span className="font-medium text-foreground">{s.quiz.title}</span>
                        <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted">{s.code}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span>By {s.quiz.teacher.name}</span>
                        <span>·</span>
                        <span>{s._count.participants} participant{s._count.participants !== 1 ? "s" : ""}</span>
                        {s._count.violations > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-danger">{s._count.violations} violation{s._count.violations !== 1 ? "s" : ""}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{new Date(s.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</span>
                        {s.startedAt && <><span>·</span><span>Started {new Date(s.startedAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}</span></>}
                        {s.endedAt && <><span>·</span><span>Ended {new Date(s.endedAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.participants.length > 0 && (
                        <button
                          onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-primary/30 hover:text-primary"
                        >
                          {isExpanded ? "Hide" : "View"} Participants
                        </button>
                      )}
                      {(s.status === "ACTIVE" || s.status === "WAITING") && (
                        <button
                          onClick={() => setForceEndTarget(s)}
                          className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/8"
                        >
                          Force End
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Participant List */}
                  {isExpanded && s.participants.length > 0 && (
                    <div className="border-t border-border/40 bg-surface/50 px-5 pb-4 pt-3">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Participants ({s.participants.length})</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                              <th className="pb-2 pr-4">Name</th>
                              <th className="pb-2 pr-4">Email</th>
                              <th className="pb-2 pr-4 text-center">Score</th>
                              <th className="pb-2 pr-4 text-center">Status</th>
                              <th className="pb-2 text-right">Answers</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {s.participants.map((p, idx) => (
                              <tr key={p.id}>
                                <td className="py-2 pr-4 font-medium text-foreground">
                                  <span className="mr-2 text-xs text-muted">#{idx + 1}</span>
                                  {p.user.name}
                                </td>
                                <td className="py-2 pr-4 text-xs text-muted">{p.user.email}</td>
                                <td className="py-2 pr-4 text-center font-semibold text-foreground">{p.score}</td>
                                <td className="py-2 pr-4 text-center">
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.isFinished ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                                    {p.isFinished ? "Finished" : "In Progress"}
                                  </span>
                                </td>
                                <td className="py-2 text-right">
                                  <button
                                    onClick={() => openAnswers(s.id, p.id, p.user.name)}
                                    className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted hover:text-primary hover:border-primary/30 transition"
                                  >
                                    Answers
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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

      {/* Force End Confirm */}
      {forceEndTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white shadow-2xl">
            <div className="px-6 py-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h3 className="text-base font-semibold text-foreground">Force-End Session?</h3>
              <p className="mt-2 text-sm text-muted">
                Session <span className="font-mono font-semibold">{forceEndTarget.code}</span> — {forceEndTarget.quiz.title}<br />
                This will immediately end the session and notify all participants.
              </p>
            </div>
            <div className="flex gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setForceEndTarget(null)} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted transition hover:bg-surface">Cancel</button>
              <button onClick={handleForceEnd} disabled={forceEndLoading} className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 hover:opacity-90" style={{ background: "var(--warning)" }}>{forceEndLoading ? "Ending..." : "Force End"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Answers Modal */}
      {answersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-white shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Answers — {answersModal.participantName}</h3>
                <p className="mt-0.5 text-xs text-muted">Per-question answer breakdown</p>
              </div>
              <button
                onClick={() => setAnswersModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-foreground transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {answersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 rounded-full border-2 border-border border-t-primary animate-spin" />
                </div>
              ) : answersData && answersData.length > 0 ? (
                <div className="space-y-3">
                  {answersData.map((a) => (
                    <div key={a.id} className={`rounded-xl border p-4 ${
                      a.isCorrect ? "border-success/20 bg-success/5" : "border-danger/20 bg-danger/5"
                    }`}>
                      <div className="flex items-start gap-3">
                        <span className={`flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                          a.isCorrect ? "bg-success" : "bg-danger"
                        }`}>
                          {a.isCorrect ? "✓" : "✗"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-muted mb-0.5">Q{a.question.order}</p>
                          <p className="text-sm font-medium text-foreground mb-1">{a.question.text}</p>
                          <p className="text-xs text-muted">Answer: <span className={`font-semibold ${
                            a.isCorrect ? "text-success" : "text-danger"
                          }`}>{a.answerText || "(no answer)"}</span></p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted">No answers recorded for this participant.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
