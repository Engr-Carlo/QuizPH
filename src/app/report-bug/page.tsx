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
        <div className="rounded-[28px] border border-border bg-gradient-to-br from-primary/8 via-card to-card p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:from-primary/10 dark:via-slate-900 dark:to-slate-900">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <IconBug />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Support</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Report history</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
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
          <div className="rounded-[22px] border border-border bg-card p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Total</p>
            <p className="mt-2 text-2xl font-black text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-[22px] border border-border bg-card p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Open</p>
            <p className="mt-2 text-2xl font-black text-foreground">{stats.open}</p>
          </div>
          <div className="rounded-[22px] border border-border bg-card p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">In review</p>
            <p className="mt-2 text-2xl font-black text-foreground">{stats.review}</p>
          </div>
          <div className="rounded-[22px] border border-border bg-card p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Resolved</p>
            <p className="mt-2 text-2xl font-black text-foreground">{stats.resolved}</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-card p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-foreground">My report history</h2>
              <p className="mt-1 text-sm text-muted">Track every update from the support team.</p>
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
                <div key={report.id} className="rounded-2xl border border-border bg-background p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-foreground">{report.title}</h3>
                        <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                          {report.category}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        Submitted {new Date(report.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>

                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${STATUS_STYLES[report.status]}`}>
                      {report.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-border bg-card p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Issue</p>
                      <p className="mt-2 text-sm leading-6 text-foreground">{report.description}</p>
                    </div>

                    {report.expectedBehavior && (
                      <div className="rounded-xl border border-border bg-card p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Expected</p>
                        <p className="mt-2 text-sm leading-6 text-foreground">{report.expectedBehavior}</p>
                      </div>
                    )}

                    {report.steps && (
                      <div className="rounded-xl border border-border bg-card p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Steps</p>
                        <pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{report.steps}</pre>
                      </div>
                    )}

                    <div className="rounded-xl border border-border bg-card p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Admin response</p>
                      <p className="mt-2 text-sm leading-6 text-foreground">
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
