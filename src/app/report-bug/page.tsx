"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface BugReportMessageItem {
  id: string;
  content: string;
  sender: "USER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

type ReportStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";

interface BugReportHistoryItem {
  id: string;
  title: string;
  category: "BUG" | "IMPROVEMENT" | "DISPUTE";
  description: string;
  expectedBehavior?: string | null;
  steps?: string | null;
  status: ReportStatus;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  messages: BugReportMessageItem[];
}

type Filter = "ALL" | "OPEN" | "IN_REVIEW" | "RESOLVED";

const STATUS_LABEL: Record<ReportStatus, string> = {
  OPEN: "Open",
  IN_REVIEW: "In review",
  RESOLVED: "Resolved",
  REJECTED: "Closed",
};

const STATUS_STYLES: Record<ReportStatus, string> = {
  OPEN: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
  IN_REVIEW: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  REJECTED: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/20",
};

const STATUS_DOT: Record<ReportStatus, string> = {
  OPEN: "bg-sky-500",
  IN_REVIEW: "bg-amber-500",
  RESOLVED: "bg-emerald-500",
  REJECTED: "bg-slate-400",
};

const CATEGORY_LABEL: Record<BugReportHistoryItem["category"], string> = {
  BUG: "Bug",
  IMPROVEMENT: "Improvement",
  DISPUTE: "Dispute",
};

function formatShort(value: string) {
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
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

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
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

function IconShield() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function ReportBugPage() {
  const [reports, setReports] = useState<BugReportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendError, setSendError] = useState("");
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/bug-reports");
      if (response.ok) {
        setReports(await response.json());
      }
      setLoading(false);
    }

    load();
  }, []);

  const counts = useMemo(() => {
    return {
      ALL: reports.length,
      OPEN: reports.filter((report) => report.status === "OPEN").length,
      IN_REVIEW: reports.filter((report) => report.status === "IN_REVIEW").length,
      RESOLVED: reports.filter((report) => report.status === "RESOLVED" || report.status === "REJECTED").length,
    };
  }, [reports]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return reports;
    if (filter === "RESOLVED") return reports.filter((report) => report.status === "RESOLVED" || report.status === "REJECTED");
    return reports.filter((report) => report.status === filter);
  }, [reports, filter]);

  const selected = useMemo(() => {
    if (selectedId) return filtered.find((report) => report.id === selectedId) ?? null;
    return filtered[0] ?? null;
  }, [filtered, selectedId]);

  const selectedMessageCount = selected?.messages.length ?? 0;

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected?.id, selectedMessageCount]);

  async function sendReply(reportId: string) {
    const content = drafts[reportId]?.trim();
    if (!content || sendingId) return;

    setSendingId(reportId);
    setSendError("");
    const response = await fetch(`/api/bug-reports/${reportId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setSendingId(null);

    if (!response.ok) {
      setSendError("Your message could not be sent. Please try again.");
      return;
    }

    const message = (await response.json()) as BugReportMessageItem;
    setDrafts((current) => ({ ...current, [reportId]: "" }));
    setReports((current) =>
      current.map((item) =>
        item.id === reportId
          ? { ...item, messages: [...item.messages, message], updatedAt: message.createdAt }
          : item
      )
    );
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <IconBug />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Support tickets</h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Track your reports and talk with the QuizPH team.
              </p>
            </div>
          </div>

          <Link
            href="/report-bug/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            <IconPlus />
            Report a bug
          </Link>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
            Loading your tickets...
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900/60">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <IconBug />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No tickets yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Found something broken or have an idea? Send us a report and follow the conversation here.
            </p>
            <Link
              href="/report-bug/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              <IconPlus />
              Report a bug
            </Link>
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
                      const hasAdminReply = report.messages.some((message) => message.sender === "ADMIN") || Boolean(report.adminNote);
                      const preview = lastMessage?.content ?? report.adminNote ?? report.description;

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
                <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <div className="border-b border-slate-100 p-5 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 lg:hidden dark:text-slate-400 dark:hover:text-white"
                    >
                      <IconBack />
                      All tickets
                    </button>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{selected.title}</h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {CATEGORY_LABEL[selected.category]} · Opened {formatShort(selected.createdAt)} · #{selected.id.slice(-6).toUpperCase()}
                        </p>
                      </div>
                      <StatusBadge status={selected.status} />
                    </div>

                    {(selected.expectedBehavior || selected.steps) && (
                      <details className="group mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/50">
                        <summary className="cursor-pointer list-none text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Report details
                          <span className="ml-1 text-slate-400 group-open:hidden">· show</span>
                        </summary>
                        <div className="mt-3 space-y-3">
                          {selected.expectedBehavior && (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Expected</p>
                              <p className="mt-1 leading-6 text-slate-700 dark:text-slate-200">{selected.expectedBehavior}</p>
                            </div>
                          )}
                          {selected.steps && (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Steps to reproduce</p>
                              <p className="mt-1 whitespace-pre-wrap leading-6 text-slate-700 dark:text-slate-200">{selected.steps}</p>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>

                  <div className="max-h-[460px] min-h-[260px] space-y-5 overflow-y-auto bg-slate-50/60 p-5 dark:bg-slate-950/30">
                    <div className="flex justify-end">
                      <div className="max-w-[88%]">
                        <div className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-6 text-white shadow-sm">
                          {selected.description}
                        </div>
                        <p className="mt-1 text-right text-[11px] text-slate-400">You · {formatShort(selected.createdAt)}</p>
                      </div>
                    </div>

                    {selected.adminNote && (
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                          <IconShield />
                        </div>
                        <div className="max-w-[88%]">
                          <div className="rounded-2xl rounded-tl-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-50">
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Status note</p>
                            <p className="whitespace-pre-wrap break-words">{selected.adminNote}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selected.messages.map((message) =>
                      message.sender === "ADMIN" ? (
                        <div key={message.id} className="flex gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                            <IconShield />
                          </div>
                          <div className="max-w-[88%]">
                            <div className="rounded-2xl rounded-tl-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-50">
                              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">QuizPH Support</p>
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-400">{message.user.name} · {formatShort(message.createdAt)}</p>
                          </div>
                        </div>
                      ) : (
                        <div key={message.id} className="flex justify-end">
                          <div className="max-w-[88%]">
                            <div className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-6 text-white shadow-sm">
                              {message.content}
                            </div>
                            <p className="mt-1 text-right text-[11px] text-slate-400">You · {formatShort(message.createdAt)}</p>
                          </div>
                        </div>
                      )
                    )}

                    {!selected.adminNote && !selected.messages.some((message) => message.sender === "ADMIN") && (
                      <p className="text-center text-xs text-slate-400">
                        Waiting for the team to respond. Their reply will appear here.
                      </p>
                    )}

                    <div ref={threadEndRef} />
                  </div>

                  <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                    <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 dark:border-slate-700 dark:bg-slate-900">
                      <textarea
                        value={drafts[selected.id] ?? ""}
                        onChange={(event) => setDrafts((current) => ({ ...current, [selected.id]: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                            event.preventDefault();
                            sendReply(selected.id);
                          }
                        }}
                        rows={2}
                        placeholder="Write a reply..."
                        className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                      />
                      <button
                        type="button"
                        disabled={sendingId === selected.id || !(drafts[selected.id] ?? "").trim()}
                        onClick={() => sendReply(selected.id)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <IconSend />
                        {sendingId === selected.id ? "Sending" : "Send"}
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-slate-400">
                      <span>Press Ctrl + Enter to send</span>
                      {sendError && <span className="font-medium text-red-500">{sendError}</span>}
                    </div>
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
