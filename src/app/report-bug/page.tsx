"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface BugReportHistoryItem {
  id: string;
  title: string;
  category: "BUG" | "IMPROVEMENT" | "DISPUTE";
  description: string;
  expectedBehavior?: string | null;
  steps?: string | null;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-400/20",
  IN_REVIEW: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-400/20",
  RESOLVED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-400/20",
  REJECTED: "bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-400/20",
};

function IconBug() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 7a3 3 0 1 0-6 0" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
      <path d="M12 20v-4" />
      <path d="M8 20h8" />
      <path d="M4 12h3" />
      <path d="M17 12h3" />
      <path d="M6 15l2-3" />
      <path d="M18 15l-2-3" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export default function ReportBugPage() {
  const [reportHistory, setReportHistory] = useState<BugReportHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoadingHistory(true);
      const response = await fetch("/api/bug-reports");
      if (response.ok) {
        setReportHistory(await response.json());
      }
      setLoadingHistory(false);
    }

    loadHistory();
  }, []);

  const stats = useMemo(() => {
    const counts = { OPEN: 0, IN_REVIEW: 0, RESOLVED: 0, REJECTED: 0 };
    reportHistory.forEach((report) => {
      counts[report.status] += 1;
    });

    return {
      total: reportHistory.length,
      open: counts.OPEN,
      review: counts.IN_REVIEW,
      resolved: counts.RESOLVED,
    };
  }, [reportHistory]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[30px] border border-slate-200 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/60 dark:border-slate-800 dark:bg-slate-900/80 dark:ring-slate-800/80">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <IconBug />
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Support</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-900 dark:text-white">Report history</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Review your submitted reports and follow up on support updates from the admin team.
                </p>
              </div>
            </div>

            <Link
              href="/report-bug/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition hover:bg-primary/90"
            >
              <IconPlus />
              Report a bug
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:ring-slate-800/80">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Total</p>
            <p className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:ring-slate-800/80">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Open</p>
            <p className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-900 dark:text-white">{stats.open}</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:ring-slate-800/80">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">In review</p>
            <p className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-900 dark:text-white">{stats.review}</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:ring-slate-800/80">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Resolved</p>
            <p className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-900 dark:text-white">{stats.resolved}</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:ring-slate-800/80">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.06em] text-slate-900 dark:text-white">My report history</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Track every update from the support team.</p>
            </div>
          </div>

          {loadingHistory ? (
            <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted">
              Loading your reports...
            </div>
          ) : reportHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center">
              <p className="text-lg font-semibold text-foreground">No reports yet</p>
              <p className="mt-2 text-sm text-muted">Your submitted bug reports will appear here after you file the first one.</p>
              <Link
                href="/report-bug/new"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
              >
                <IconPlus />
                Create report
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {reportHistory.map((report) => (
                <div key={report.id} className="rounded-[22px] border border-slate-200 bg-slate-50/60 p-4 shadow-sm ring-1 ring-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:ring-slate-800/80">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold tracking-[-0.03em] text-slate-900 dark:text-white">{report.title}</h3>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {report.category}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Submitted {new Date(report.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>

                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${STATUS_STYLES[report.status]}`}>
                      {report.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950/40">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Issue</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          User report
                        </span>
                      </div>
                      <p className="mt-2 text-[15px] leading-7 text-slate-800 dark:text-slate-200">{report.description}</p>
                    </div>

                    {report.expectedBehavior && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950/40">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Expected</p>
                        <p className="mt-2 text-[15px] leading-7 text-slate-800 dark:text-slate-200">{report.expectedBehavior}</p>
                      </div>
                    )}

                    {report.steps && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950/40">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Steps</p>
                        <pre className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-slate-800 dark:text-slate-200">{report.steps}</pre>
                      </div>
                    )}

                    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-3 shadow-[0_12px_24px_rgba(16,185,129,0.08)] dark:border-emerald-500/20 dark:from-emerald-500/10 dark:via-slate-900 dark:to-sky-500/10">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Admin response</p>
                        <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                          Support update
                        </span>
                      </div>
                      <p className="mt-2 text-[15px] leading-7 text-slate-800 dark:text-slate-100">
                        {report.adminNote || "No admin response yet. We will update this once it is reviewed."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
