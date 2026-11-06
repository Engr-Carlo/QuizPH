"use client";

import { useEffect, useState } from "react";
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

const STATUS_OPTIONS = [
  "OPEN",
  "IN_REVIEW",
  "RESOLVED",
  "REJECTED",
] as const;

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-sky-100 text-sky-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-slate-200 text-slate-700",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminBugReportsPage() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  async function fetchReports() {
    setLoading(true);
    const response = await fetch("/api/admin/bug-reports");
    if (response.ok) {
      setReports(await response.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchReports();
  }, []);

  async function updateStatus(reportId: string, status: string, adminNote: string) {
    setSavingId(reportId);
    const response = await fetch(`/api/admin/bug-reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNote }),
    });
    setSavingId(null);

    if (response.ok) {
      await fetchReports();
    }
  }

  async function addReply(reportId: string) {
    const content = replyDrafts[reportId]?.trim();
    if (!content) return;

    setReplyingId(reportId);
    const response = await fetch(`/api/admin/bug-reports/${reportId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setReplyingId(null);

    if (response.ok) {
      setReplyDrafts((current) => ({ ...current, [reportId]: "" }));
      await fetchReports();
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground">Bug reports</h1>
            <p className="mt-1 text-sm text-muted">Track user issues, improvement requests, and disputes.</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-border bg-card p-6 text-sm text-muted">
            Loading reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-border bg-card p-10 text-center text-sm text-muted">
            No reports have been submitted yet.
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report, index) => (
              <div key={report.id} className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 border-b border-border pb-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                      Ticket #{String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {report.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>Updated {formatDate(report.updatedAt || report.createdAt)}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${STATUS_STYLES[report.status]}`}>
                      {report.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-foreground">{report.title}</h2>
                    </div>
                    <p className="text-sm text-muted">
                      By {report.user.name} · {report.user.role} · {report.user.email}
                    </p>
                    <p className="text-xs text-muted">Submitted {formatDate(report.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Issue</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">{report.description}</p>
                  </div>

                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Expected behavior</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      {report.expectedBehavior || "No expected behavior provided."}
                    </p>
                  </div>
                </div>

                {report.steps && (
                  <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Steps</p>
                    <pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{report.steps}</pre>
                  </div>
                )}

                {report.screenshotDataUrl && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface p-2">
                    <img
                      src={report.screenshotDataUrl}
                      alt={report.screenshotName || "Bug report screenshot"}
                      className="max-h-80 w-full rounded-xl object-contain"
                    />
                  </div>
                )}

                <div className="mt-5 space-y-4 rounded-2xl border border-border bg-background p-4">
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Conversation</p>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {report.messages.length} message{report.messages.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {report.messages.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No follow-up messages yet.</p>
                      ) : (
                        report.messages.map((message) => {
                          const isAdmin = message.sender === "ADMIN";

                          return (
                            <div
                              key={message.id}
                              className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl border p-3 shadow-sm ${
                                  isAdmin
                                    ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900 dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-slate-900 dark:text-emerald-100"
                                    : "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.1em]">
                                    {isAdmin ? "Admin" : message.user.name}
                                  </p>
                                  <span className="text-[9px] opacity-70">
                                    {formatDate(message.createdAt)}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm leading-6">{message.content}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted">Admin status</label>
                    <select
                      data-report-id={report.id}
                      defaultValue={report.status}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status.replace("_", " ")}
                        </option>
                      ))}
                    </select>

                    <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted">Admin note</label>
                    <textarea
                      id={`admin-note-${report.id}`}
                      defaultValue={report.adminNote ?? ""}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Add a quick summary or resolution note."
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={savingId === report.id}
                        onClick={() => {
                          const select = document.querySelector(`select[data-report-id="${report.id}"]`) as HTMLSelectElement | null;
                          const targetStatus = select?.value ?? report.status;
                          const noteInput = document.getElementById(`admin-note-${report.id}`) as HTMLTextAreaElement | null;
                          const noteValue = noteInput?.value ?? report.adminNote ?? "";
                          updateStatus(report.id, targetStatus, noteValue);
                        }}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingId === report.id ? "Saving..." : "Save update"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-dashed border-border bg-card p-3">
                    <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted">Add reply</label>
                    <textarea
                      value={replyDrafts[report.id] ?? ""}
                      onChange={(event) =>
                        setReplyDrafts((current) => ({
                          ...current,
                          [report.id]: event.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Add a follow-up response to the user..."
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={replyingId === report.id || !((replyDrafts[report.id] ?? "").trim())}
                        onClick={() => addReply(report.id)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {replyingId === report.id ? "Sending..." : "Send reply"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
