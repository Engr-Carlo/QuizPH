"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface ViolationEntry {
  type: string;
  count: number;
  timestamp: string;
}

interface ParticipantViolations {
  participantId: string;
  name: string;
  email: string;
  note: string | null;
  violations: ViolationEntry[];
}

interface SessionSummary {
  sessionId: string;
  sessionCode: string;
  quizTitle: string;
  totalViolations: number;
  participants: ParticipantViolations[];
}

const VIOLATION_BADGE: Record<string, string> = {
  FULLSCREEN_EXIT: "bg-warning/10 text-warning",
  TAB_SWITCH: "bg-warning/10 text-warning",
  COPY_PASTE: "bg-secondary/10 text-secondary",
  RIGHT_CLICK: "bg-secondary/10 text-secondary",
  DEVTOOLS: "bg-danger/10 text-danger",
  SCREENSHOT_ATTEMPT: "bg-danger/10 text-danger",
};

const VIOLATION_LABEL: Record<string, string> = {
  FULLSCREEN_EXIT: "Fullscreen Exit",
  TAB_SWITCH: "Tab Switch",
  COPY_PASTE: "Copy/Paste",
  RIGHT_CLICK: "Right Click",
  DEVTOOLS: "DevTools",
  SCREENSHOT_ATTEMPT: "Screenshot",
};

export default function AdminViolationsPage() {
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  // notes: keyed by participantId, value is current note text
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "100" });
    const res = await fetch(`/api/admin/violations?${params}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setSummaries(data.sessionSummaries);
      setTotal(data.total);
      // Seed notes state from API response
      const noteMap: Record<string, string> = {};
      for (const s of data.sessionSummaries) {
        for (const p of s.participants) {
          if (p.note) noteMap[p.participantId] = p.note;
        }
      }
      setNotes((prev) => ({ ...noteMap, ...prev }));
    }
    setLoading(false);
  }, [page]);

  async function saveNote(participantId: string) {
    setSavingNote(participantId);
    await fetch("/api/admin/violations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, note: notes[participantId] ?? "" }),
    });
    setSavingNote(null);
    setEditingNote(null);
  }

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Violations</h1>
        <p className="mt-1 text-sm text-muted">Anti-cheat violation logs grouped by session. Expand a session to see flagged students.</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={nameSearch}
          onChange={(e) => setNameSearch(e.target.value)}
          placeholder="Search student name…"
          className="w-52 rounded-lg border border-border px-3 py-1.5 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex flex-wrap gap-1.5">
          {["", "FULLSCREEN_EXIT", "TAB_SWITCH", "COPY_PASTE", "RIGHT_CLICK", "DEVTOOLS", "SCREENSHOT_ATTEMPT"].map((t) => (
            <button
              key={t || "ALL"}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                typeFilter === t ? "bg-primary text-white" : "border border-border bg-white text-muted hover:text-foreground"
              }`}
            >
              {t === "" ? "All types" : VIOLATION_LABEL[t] ?? t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
        </div>
      ) : summaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <p className="text-sm font-semibold text-foreground">No violations recorded</p>
          <p className="mt-1 text-xs text-muted">All sessions so far have been clean.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map((s) => {
            // Client-side filter by type and name
            const filteredParticipants = s.participants.filter((p) => {
              const matchName = nameSearch === "" || p.name.toLowerCase().includes(nameSearch.toLowerCase());
              const matchType = typeFilter === "" || p.violations.some((v) => v.type === typeFilter);
              return matchName && matchType;
            });
            if (filteredParticipants.length === 0) return null;

            const isExpanded = expandedSession === s.sessionId;
            return (
              <div key={s.sessionId} className="overflow-hidden rounded-xl border border-border bg-white">
                {/* Session Header Row */}
                <button
                  onClick={() => setExpandedSession(isExpanded ? null : s.sessionId)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-surface/40"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-danger/10">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{s.quizTitle}</span>
                      <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted">{s.sessionCode}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{s.participants.length} student{s.participants.length !== 1 ? "s" : ""} flagged</span>
                      <span>·</span>
                      <span className="font-semibold text-danger">{s.totalViolations} total violation{s.totalViolations !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <svg
                    className={`h-4 w-4 flex-shrink-0 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Expanded Participants */}
                {isExpanded && (
                  <div className="border-t border-border/40 divide-y divide-border/30">
                    {filteredParticipants.map((p) => {
                      const pid = p.participantId;
                      const participantTotal = p.violations.reduce((sum, v) => sum + v.count, 0);
                      const isEditingThisNote = editingNote === pid;
                      return (
                        <div key={p.email} className="px-5 py-4">
                          <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                              {p.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground">{p.name}</p>
                              <p className="text-xs text-muted">{p.email} · {participantTotal} violation{participantTotal !== 1 ? "s" : ""}</p>
                            </div>
                            <button
                              onClick={() => {
                                setEditingNote(isEditingThisNote ? null : pid);
                                if (!isEditingThisNote) setNotes((prev) => ({ ...prev, [pid]: prev[pid] ?? p.note ?? "" }));
                              }}
                              className="flex-shrink-0 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted hover:text-primary hover:border-primary/30 transition"
                            >
                              {isEditingThisNote ? "Cancel" : notes[pid] || p.note ? "Edit Note" : "+ Note"}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {p.violations.map((v, idx) => (
                              <div key={idx} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${VIOLATION_BADGE[v.type] || "bg-muted/10 text-muted"}`}>
                                {VIOLATION_LABEL[v.type] || v.type}
                                {v.count > 1 && <span className="rounded-full bg-current/20 px-1.5">×{v.count}</span>}
                              </div>
                            ))}
                          </div>
                          <p className="mt-2 text-[10px] text-muted">
                            Last: {new Date(p.violations[p.violations.length - 1].timestamp).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </p>
                          {/* Admin note */}
                          {(notes[pid] || p.note) && !isEditingThisNote && (
                            <p className="mt-2 text-xs italic text-muted border-l-2 border-border pl-2">{notes[pid] ?? p.note}</p>
                          )}
                          {isEditingThisNote && (
                            <div className="mt-2 flex gap-2">
                              <textarea
                                rows={2}
                                value={notes[pid] ?? ""}
                                onChange={(e) => setNotes((prev) => ({ ...prev, [pid]: e.target.value }))}
                                placeholder="Add an admin note about this student…"
                                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none resize-none"
                              />
                              <button
                                onClick={() => saveNote(pid)}
                                disabled={savingNote === pid}
                                className="self-end rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition"
                              >
                                {savingNote === pid ? "Saving…" : "Save"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 100 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted">Showing page {page}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-primary/30 hover:text-primary disabled:opacity-40">Prev</button>
            <button disabled={page * 100 >= total} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-primary/30 hover:text-primary disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
