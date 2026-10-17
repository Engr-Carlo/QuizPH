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
  OPEN: "bg-sky-100 text-sky-700 border-sky-200",
  IN_REVIEW: "bg-amber-100 text-amber-700 border-amber-200",
  RESOLVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-slate-200 text-slate-700 border-slate-300",
};

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
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-foreground">Report a bug</h1>
          <p className="mt-1 text-sm text-muted">
            Tell us what you saw, what should happen, or let us know if you want a dispute reviewed.
          </p>
        </div>

        <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Report type</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as (typeof REPORT_CATEGORIES)[number]["value"])}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">What did you see?</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                placeholder="Describe the issue you noticed, where it happened, and any relevant details."
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">What should have happened?</label>
              <textarea
                value={expectedBehavior}
                onChange={(event) => setExpectedBehavior(event.target.value)}
                rows={3}
                placeholder="Describe the expected behavior or the improvement you want."
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Steps to reproduce (optional)</label>
              <textarea
                value={steps}
                onChange={(event) => setSteps(event.target.value)}
                rows={3}
                placeholder="1. Open the app\n2. Tap Join a Quiz\n3. See the issue"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Attach a screenshot (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full rounded-xl border border-dashed border-border bg-background px-3 py-2.5 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
              />
              {screenshotName && (
                <p className="mt-2 text-xs text-muted">Selected: {screenshotName}</p>
              )}
            </div>

            {screenshotDataUrl && (
              <div className="overflow-hidden rounded-2xl border border-border bg-surface p-2">
                <img src={screenshotDataUrl} alt="Bug report attachment" className="max-h-72 w-full rounded-xl object-contain" />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push(redirectPath)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(37,99,235,0.28)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-foreground">My report history</h2>
              <p className="mt-1 text-sm text-muted">Check updates, current status, and admin comments.</p>
            </div>
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
                <div key={report.id} className="rounded-2xl border border-border bg-background p-4">
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

                  <div className="mt-3 rounded-xl border border-border bg-card p-3 text-sm text-foreground">
                    <p className="font-semibold text-foreground">Issue</p>
                    <p className="mt-1 leading-6 text-muted">{report.description}</p>
                  </div>

                  {report.expectedBehavior && (
                    <div className="mt-3 rounded-xl border border-border bg-card p-3 text-sm text-foreground">
                      <p className="font-semibold text-foreground">Expected behavior</p>
                      <p className="mt-1 leading-6 text-muted">{report.expectedBehavior}</p>
                    </div>
                  )}

                  {report.steps && (
                    <div className="mt-3 rounded-xl border border-border bg-card p-3 text-sm text-foreground">
                      <p className="font-semibold text-foreground">Steps</p>
                      <pre className="mt-1 whitespace-pre-wrap leading-6 text-muted">{report.steps}</pre>
                    </div>
                  )}

                  <div className="mt-3 rounded-xl border border-border bg-card p-3 text-sm text-foreground">
                    <p className="font-semibold text-foreground">Admin response</p>
                    <p className="mt-1 leading-6 text-muted">
                      {report.adminNote || "No admin response yet. We will update this once it is reviewed."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 rounded-xl border px-4 py-3 text-sm shadow-lg ${
            toast.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {toast.message}
        </div>
      )}
    </DashboardLayout>
  );
}
