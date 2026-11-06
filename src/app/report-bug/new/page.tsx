"use client";

import { ChangeEvent, useMemo, useState } from "react";
import Link from "next/link";
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

function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

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

function IconUpload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
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

export default function NewReportBugPage() {
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
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const redirectPath = useMemo(
    () => (session?.user?.role === "TEACHER" ? "/teacher" : "/student"),
    [session?.user?.role]
  );

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

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
    if (createdReport?.id) {
      setToast({ kind: "success", message: "Bug report submitted successfully." });
      setTimeout(() => {
        setToast(null);
        router.push("/report-bug");
      }, 1200);
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/report-bug" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            <IconArrowLeft />
            Back to reports
          </Link>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/60 dark:border-slate-800 dark:bg-slate-900/80 dark:ring-slate-800/80">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <IconBug />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Support</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-900 dark:text-white">Submit a bug report</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Tell us what went wrong, how it happened, and what you expected so we can fix it quickly.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:ring-slate-800/80">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">Report type</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as (typeof REPORT_CATEGORIES)[number]["value"])}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white"
              >
                {REPORT_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Join session button freezes on mobile"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">What did you see?</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                placeholder="Describe the issue you noticed, where it happened, and any relevant details."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">What should have happened?</label>
                <textarea
                  value={expectedBehavior}
                  onChange={(event) => setExpectedBehavior(event.target.value)}
                  rows={4}
                  placeholder="Expected behavior or improvement"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">Steps to reproduce</label>
                <textarea
                  value={steps}
                  onChange={(event) => setSteps(event.target.value)}
                  rows={4}
                  placeholder="1. Open the app\n2. Tap Join a Quiz\n3. See the issue"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Attachment</label>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Optional screenshot to help us investigate.</p>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
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
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Selected: {screenshotName}</p>
              )}
            </div>

            {screenshotDataUrl && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950/50">
                <img src={screenshotDataUrl} alt="Bug report attachment" className="max-h-80 w-full rounded-xl object-contain" />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/report-bug")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
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
