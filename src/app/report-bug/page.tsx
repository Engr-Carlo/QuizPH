"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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

const REPORT_CATEGORIES = [
  { value: "BUG", label: "Bug" },
  { value: "IMPROVEMENT", label: "Improvement" },
  { value: "DISPUTE", label: "Dispute" },
] as const;

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

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

export default function ReportBugPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof REPORT_CATEGORIES)[number]["value"]>("BUG");
  const [description, setDescription] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [steps, setSteps] = useState("");
  const [screenshotName, setScreenshotName] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reportHistory, setReportHistory] = useState<BugReportHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  async function loadHistory() {
    setLoadingHistory(true);
    const response = await fetch("/api/bug-reports");
    if (response.ok) {
      setReportHistory(await response.json());
    }
    setLoadingHistory(false);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const redirectPath = useMemo(
    () => (session?.user?.role === "TEACHER" ? "/teacher" : "/student"),
    [session?.user?.role]
  );

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setToast({ kind: "error", message: "Please upload a valid image file." });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotDataUrl(String(reader.result ?? ""));
      setScreenshotName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      setToast({ kind: "error", message: "Please add a title and a description." });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (trimmedTitle.length < 5) {
      setToast({ kind: "error", message: "Please make the title a bit more specific." });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (trimmedDescription.length < 12) {
      setToast({ kind: "error", message: "Please provide a little more detail so we can investigate." });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSubmitting(true);

    const response = await fetch("/api/bug-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: trimmedTitle,
        category,
        description: trimmedDescription,
        expectedBehavior: expectedBehavior.trim(),
        steps: steps.trim(),
        screenshotDataUrl,
        screenshotName,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      setToast({ kind: "error", message: payload.error || "Failed to submit the report." });
      setTimeout(() => setToast(null), 3500);
      return;
    }

    const createdReport = payload as BugReportHistoryItem;
    setReportHistory((current) => [createdReport, ...current]);
    setToast({ kind: "success", message: "Bug report submitted successfully." });
    setTimeout(() => {
      setToast(null);
      router.push(redirectPath);
    }, 1200);
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[28px] border border-border bg-gradient-to-br from-primary/8 via-card to-card p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:from-primary/10 dark:via-slate-900 dark:to-slate-900">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <IconBug />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Support</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Report a bug</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  Help us improve the experience by reporting issues, suggesting improvements, or raising a dispute.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-background/80 p-2 shadow-sm">
              <div className="rounded-xl bg-surface px-3 py-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Issues</p>
                <p className="mt-1 text-lg font-black text-foreground">1</p>
              </div>
              <div className="rounded-xl bg-surface px-3 py-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Review</p>
                <p className="mt-1 text-lg font-black text-foreground">2</p>
              </div>
              <div className="rounded-xl bg-surface px-3 py-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Resolved</p>
                <p className="mt-1 text-lg font-black text-foreground">3</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Submit a report</h2>
                <p className="mt-1 text-sm text-muted">Share the details so we can investigate quickly.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Report type</label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as (typeof REPORT_CATEGORIES)[number]["value"]) }
                  className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                >
                  {REPORT_CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Join session button freezes on mobile"
                  className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">What did you see?</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  placeholder="Describe the issue you noticed, where it happened, and any relevant details."
                  className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">What should have happened?</label>
                  <textarea
                    value={expectedBehavior}
                    onChange={(event) => setExpectedBehavior(event.target.value)}
                    rows={4}
                    placeholder="Expected behavior or improvement"
                    className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Steps to reproduce</label>
                  <textarea
                    value={steps}
                    onChange={(event) => setSteps(event.target.value)}
                    rows={4}
                    placeholder="1. Open the app\n2. Tap Join a Quiz\n3. See the issue"
                    className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-border bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <label className="block text-sm font-semibold text-foreground">Attachment</label>
                    <p className="mt-1 text-xs text-muted">Optional screenshot to help us investigate.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary">
                    <IconUpload />
                    Upload image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {screenshotName && (
                  <p className="mt-3 text-xs text-muted">Selected: {screenshotName}</p>
                )}
              </div>

              {screenshotDataUrl && (
                <div className="overflow-hidden rounded-2xl border border-border bg-surface p-2">
                  <img src={screenshotDataUrl} alt="Bug report attachment" className="max-h-80 w-full rounded-xl object-contain" />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.push(redirectPath)}
                  className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <IconCheck />
                      Submit report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-card p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-foreground">My report history</h2>
              <p className="mt-1 text-sm text-muted">Track every update from the support team.</p>
            </div>

            {loadingHistory ? (
              <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted">
                Loading your reports...
              </div>
            ) : reportHistory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted">
                You have not submitted any reports yet.
              </div>
            ) : (
              <div className="space-y-4">
                {reportHistory.map((report) => (
                  <div key={report.id} className="rounded-2xl border border-border bg-background p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground">{report.title}</h3>
                          <span className="rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">
                            {report.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted">
                          Submitted {new Date(report.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>

                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${STATUS_STYLES[report.status]}`}>
                        {report.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mt-3 space-y-3">
                      <div className="rounded-xl border border-border bg-surface/60 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Issue</p>
                        <p className="mt-2 text-sm leading-6 text-foreground">{report.description}</p>
                      </div>

                      {report.expectedBehavior && (
                        <div className="rounded-xl border border-border bg-surface/60 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Expected</p>
                          <p className="mt-2 text-sm leading-6 text-foreground">{report.expectedBehavior}</p>
                        </div>
                      )}

                      {report.steps && (
                        <div className="rounded-xl border border-border bg-surface/60 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Steps</p>
                          <pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{report.steps}</pre>
                        </div>
                      )}

                      <div className="rounded-xl border border-border bg-surface/60 p-3">
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
      </div>

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 rounded-xl border px-4 py-3 text-sm shadow-lg ${
            toast.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          }`}
        >
          {toast.message}
        </div>
      )}
    </DashboardLayout>
  );
}
