"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface BugReportUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface BugReportMessage {
  id: string;
  content: string;
  sender: "USER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
  user: BugReportUser;
}

interface BugReport {
  id: string;
  title: string;
  category: "BUG" | "IMPROVEMENT" | "DISPUTE";
  description: string;
  expectedBehavior?: string | null;
  steps?: string | null;
  screenshotDataUrl?: string | null;
  screenshotName?: string | null;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  user: BugReportUser;
  messages: BugReportMessage[];
}

type Filter = "ALL" | "OPEN" | "IN_REVIEW" | "RESOLVED";

const STATUS_LABEL: Record<BugReport["status"], string> = {
  OPEN: "Open",
  IN_REVIEW: "In review",
  RESOLVED: "Resolved",
  REJECTED: "Closed",
};

const STATUS_STYLES: Record<BugReport["status"], string> = {
  OPEN: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
  IN_REVIEW: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  REJECTED: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/20",
};

const STATUS_DOT: Record<BugReport["status"], string> = {
  OPEN: "bg-sky-500",
  IN_REVIEW: "bg-amber-500",
  RESOLVED: "bg-emerald-500",
  REJECTED: "bg-slate-400",
};

const CATEGORY_LABEL: Record<BugReport["category"], string> = {
  BUG: "Bug",
  IMPROVEMENT: "Improvement",
  DISPUTE: "Dispute",
};

function formatShort(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function IconBug() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2l1.9 1.9" />
      <path d="M16 2l-1.9 1.9" />
      <path d="M9 7.1V6a3 3 0 0 1 6 0v1.1" />
      <path d="M12 20a6 6 0 0 1-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3a6 6 0 0 1-6 6z" />
      <path d="M12 20v-9" />
      <path d="M6.5 13H2" />
      <path d="M17.5 13H22" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m22 2-7 20-4-9-9-4 20-7z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function StatusBadge({ status }: { status: BugReport["status"] }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function AdminBugReportsPage() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [replyError, setReplyError] = useState("");
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  async function fetchReports() {
    setLoading(true);
    const response = await fetch("/api/admin/bug-reports");
    if (response.ok) {
      const data = (await response.json()) as BugReport[];
      setReports(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    void fetchReports();
  }, []);

  useEffect(() => {
    if (!reports.length) {
      setStatusDrafts({});
      setNoteDrafts({});
      return;
    }

    setStatusDrafts((current) => {
      const next = { ...current };
      for (const report of reports) {
        if (!(report.id in next)) {
          next[report.id] = report.status;
        }
      }
      return next;
    });

    setNoteDrafts((current) => {
      const next = { ...current };
      for (const report of reports) {
        if (!(report.id in next)) {
          next[report.id] = report.adminNote ?? "";
        }
      }
      return next;
    });
  }, [reports]);

  const counts = useMemo(
    () => ({
      ALL: reports.length,
      OPEN: reports.filter((report) => report.status === "OPEN").length,
      IN_REVIEW: reports.filter((report) => report.status === "IN_REVIEW").length,
      RESOLVED: reports.filter((report) => report.status === "RESOLVED" || report.status === "REJECTED").length,
    }),
    [reports]
  );

  const filtered = useMemo(() => {
    if (filter === "ALL") return reports;
    if (filter === "RESOLVED") return reports.filter((report) => report.status === "RESOLVED" || report.status === "REJECTED");
    return reports.filter((report) => report.status === filter);
  }, [reports, filter]);

  const selected = useMemo(() => {
    if (selectedId) return filtered.find((report) => report.id === selectedId) ?? null;
    return filtered[0] ?? null;
  }, [filtered, selectedId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected?.id, selected?.messages.length]);

  async function updateStatus(reportId: string) {
    const status = statusDrafts[reportId] ?? "OPEN";
    const adminNote = (noteDrafts[reportId] ?? "").trim();
    setSavingId(reportId);
    setSaveError("");

    const response = await fetch(`/api/admin/bug-reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNote }),
    });

    setSavingId(null);

    if (!response.ok) {
      setSaveError("The status update could not be saved. Try again.");
      return;
    }

    await fetchReports();
  }

  async function addReply(reportId: string) {
    const content = (replyDrafts[reportId] ?? "").trim();
    if (!content) {
      setReplyError("Write a reply before sending.");
      return;
    }

    setReplyingId(reportId);
    setReplyError("");

    const response = await fetch(`/api/admin/bug-reports/${reportId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    setReplyingId(null);

    if (!response.ok) {
      setReplyError("The reply could not be sent.");
      return;
    }

    setReplyDrafts((current) => ({ ...current, [reportId]: "" }));
    await fetchReports();
  }

  const filters: Array<{ key: Filter; label: string }> = [
    { key: "ALL", label: "All" },
    { key: "OPEN", label: "Open" },
    { key: "IN_REVIEW", label: "In review" },
    { key: "RESOLVED", label: "Closed" },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <IconBug />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Support inbox</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Review bugs, updates, and user feedback across the platform.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
            Loading tickets...
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900/60">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <IconBug />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No tickets yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              There are no reports from users right now.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className={`${selectedId ? "hidden lg:block" : "block"}`}>
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex gap-1 border-b border-slate-100 p-2 dark:border-slate-800">
                  {filters.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setFilter(item.key);
                        setSelectedId(null);
                      }}
                      className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${
                        filter === item.key
                          ? "bg-primary/10 text-primary"
                          : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                      }`}
                    >
                      {item.label}
                      <span className="ml-1 opacity-70">{counts[item.key]}</span>
                    </button>
                  ))}
                </div>

                <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                  {filtered.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">No tickets in this view.</p>
                  ) : (
                    filtered.map((report) => {
                      const isActive = selected?.id === report.id;
                      const lastMessage = report.messages[report.messages.length - 1];
                      const preview = lastMessage?.content ?? report.adminNote ?? report.description;
                      const hasAdminReply = report.messages.some((message) => message.sender === "ADMIN") || Boolean(report.adminNote);

                      return (
                        <button
                          key={report.id}
                          type="button"
                          onClick={() => setSelectedId(report.id)}
                          className={`block w-full px-4 py-3.5 text-left transition ${
                            isActive ? "bg-primary/5" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-white">{report.title}</p>
                            <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(report.updatedAt || report.createdAt)}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{preview}</p>
                          <div className="mt-2.5 flex items-center gap-2">
                            <StatusBadge status={report.status} />
                            {hasAdminReply && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <IconShield />
                                Team replied
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </aside>

            <section className={`${selectedId ? "block" : "hidden lg:block"}`}>
              {selected ? (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <div className="border-b border-slate-100 p-5 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 lg:hidden dark:text-slate-400 dark:hover:text-white"
                    >
                      <span aria-hidden="true">←</span>
                      All tickets
                    </button>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{selected.title}</h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {CATEGORY_LABEL[selected.category]} · Submitted by {selected.user.name} · {selected.user.email} · {formatShort(selected.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>

                  <div className="lg:grid lg:grid-cols-[minmax(0,1.3fr)_320px]">
                    <div className="bg-slate-50/60 p-5 dark:bg-slate-950/30">
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-400">Issue summary</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{selected.description}</p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-400">Expected behavior</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                              {selected.expectedBehavior || "No expected behavior provided."}
                            </p>
                          </div>
                        </div>

                        {selected.steps && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-400">Steps to reproduce</p>
                            <pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{selected.steps}</pre>
                          </div>
                        )}

                        {selected.screenshotDataUrl && (
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900/80">
                            <img
                              src={selected.screenshotDataUrl}
                              alt={selected.screenshotName || "Bug report screenshot"}
                              className="max-h-72 w-full rounded-xl object-contain"
                            />
                          </div>
                        )}

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-400">Conversation</p>
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {selected.messages.length} msg{selected.messages.length === 1 ? "" : "s"}
                            </span>
                          </div>

                          <div className="space-y-4">
                            {selected.messages.length === 0 ? (
                              <p className="text-sm text-slate-500 dark:text-slate-400">No follow-up messages yet.</p>
                            ) : (
                              selected.messages.map((message) => {
                                const isAdmin = message.sender === "ADMIN";

                                return (
                                  <div key={message.id} className={isAdmin ? "flex justify-end" : "flex justify-start"}>
                                    <div className="max-w-[88%]">
                                      <div
                                        className={`rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm ${
                                          isAdmin
                                            ? "rounded-br-md border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-50"
                                            : "rounded-bl-md border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        }`}
                                      >
                                        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-current/75">
                                          {isAdmin ? "QuizPH Support" : message.user.name}
                                        </p>
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                      </div>
                                      <p className="mt-1 text-[11px] text-slate-400">
                                        {isAdmin ? "Support" : "User"} · {formatShort(message.createdAt)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {selected.adminNote && (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-emerald-700 dark:text-emerald-300">Status note</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-950 dark:text-emerald-50">{selected.adminNote}</p>
                          </div>
                        )}

                        <div ref={threadEndRef} />
                      </div>
                    </div>

                    <aside className="border-t border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60 lg:border-l lg:border-t-0">
                      <div className="space-y-5">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-400">Status</label>
                          <select
                            value={statusDrafts[selected.id] ?? selected.status}
                            onChange={(event) =>
                              setStatusDrafts((current) => ({
                                ...current,
                                [selected.id]: event.target.value,
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          >
                            {Object.keys(STATUS_LABEL).map((status) => (
                              <option key={status} value={status}>
                                {STATUS_LABEL[status as BugReport["status"]]}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-400">Admin note</label>
                          <textarea
                            value={noteDrafts[selected.id] ?? ""}
                            onChange={(event) =>
                              setNoteDrafts((current) => ({
                                ...current,
                                [selected.id]: event.target.value,
                              }))
                            }
                            rows={5}
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            placeholder="Add a summary or resolution note for the user."
                          />
                        </div>

                        {saveError && <p className="text-sm text-red-500">{saveError}</p>}

                        <button
                          type="button"
                          onClick={() => updateStatus(selected.id)}
                          disabled={savingId === selected.id}
                          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingId === selected.id ? "Saving..." : "Save update"}
                        </button>

                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/70">
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-400">Reply to user</label>
                          <textarea
                            value={replyDrafts[selected.id] ?? ""}
                            onChange={(event) =>
                              setReplyDrafts((current) => ({
                                ...current,
                                [selected.id]: event.target.value,
                              }))
                            }
                            rows={4}
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            placeholder="Write a follow-up message for the report..."
                          />

                          {replyError && <p className="mt-2 text-sm text-red-500">{replyError}</p>}

                          <button
                            type="button"
                            onClick={() => addReply(selected.id)}
                            disabled={replyingId === selected.id || !(replyDrafts[selected.id] ?? "").trim()}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <IconSend />
                            {replyingId === selected.id ? "Sending..." : "Send reply"}
                          </button>
                        </div>
                      </div>
                    </aside>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                  Select a ticket to view the conversation.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
