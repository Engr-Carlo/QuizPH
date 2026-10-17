"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { buttonPrimary, buttonSecondary } from "@/components/dashboard/primitives";
import { cn } from "@/lib/utils";
import Link from "next/link";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-white shadow-sm">
      <header className="border-b border-border/70 px-6 py-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </header>
      <div className="space-y-5 px-6 py-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function ChoiceCard({
  selected,
  onSelect,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3.5 text-left transition",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-white hover:border-primary/40"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-primary" : "border-border"
        )}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>}
      </span>
    </button>
  );
}

function ToggleRow({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 flex-shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border"
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-[#fff] shadow transition-transform",
            checked && "translate-x-4"
          )}
        />
      </button>
    </div>
  );
}

export default function CreateQuizPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const teacherHasUniversity = session?.user?.role === "TEACHER"
    ? ((session.user.universities?.length ?? 0) > 0 || Boolean(session.user.university?.trim()))
    : true;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "error" | "info" } | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timerType, setTimerType] = useState<"PER_QUIZ" | "PER_QUESTION">("PER_QUIZ");
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [questionSelectionMode, setQuestionSelectionMode] = useState<"ALL" | "RANDOM" | "MANUAL">("ALL");
  const [randomQuestionScope, setRandomQuestionScope] = useState<"SESSION" | "PARTICIPANT">("SESSION");
  const [questionDrawCount, setQuestionDrawCount] = useState(10);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeAnswers, setRandomizeAnswers] = useState(false);
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(false);
  const [allowSkip, setAllowSkip] = useState(true);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!teacherHasUniversity) {
      setToast({
        message: "Please add at least one university in Settings before creating a quiz.",
        tone: "error",
      });
      return;
    }

    setLoading(true);

    const duration = (durationMinutes * 60) + durationSeconds;

    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        timerType,
        duration,
        questionSelectionMode,
        randomQuestionScope,
        questionDrawCount: questionSelectionMode === "RANDOM" ? questionDrawCount : null,
        randomizeQuestions,
        randomizeAnswers,
        antiCheatEnabled,
        allowSkip,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create quiz");
      return;
    }

    router.push(`/teacher/quiz/${data.id}`);
  }

  const displayDuration = `${durationMinutes} min${durationSeconds ? ` ${durationSeconds}s` : ""}`;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        <nav className="mb-5 flex items-center gap-2 text-sm text-muted" aria-label="Breadcrumb">
          <Link href="/teacher/my-quizzes" className="transition hover:text-foreground">My quizzes</Link>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-foreground">Create quiz</span>
        </nav>

        <h1 className="text-xl font-semibold tracking-tight text-foreground">Create a new quiz</h1>
        <p className="mb-7 mt-1 text-sm text-muted">Set the basics now. You can add questions right after creating it.</p>

        {!teacherHasUniversity && (
          <div className="mb-6 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
            Please add at least one university in Settings before creating a quiz.
          </div>
        )}

        {toast && (
          <div className="toast-enter fixed right-5 top-5 z-50 w-[min(420px,calc(100vw-2rem))]">
            <div className={`rounded-xl border bg-white p-4 shadow-lg ${toast.tone === "error" ? "border-danger/30 text-danger" : "border-warning/30 text-warning"}`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-danger/10 text-danger">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-5">{toast.message}</p>
                  {toast.tone === "error" && (
                    <button
                      type="button"
                      onClick={() => router.push("/settings")}
                      className="mt-2 inline-flex items-center text-xs font-semibold underline underline-offset-2"
                    >
                      Open Settings
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="ml-2 text-sm font-bold opacity-70 transition hover:opacity-100"
                  aria-label="Dismiss notification"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger/5 p-3.5 text-sm text-danger" role="alert">
              <svg className="mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <FormSection title="Basic info" description="What students will see when they join.">
            <Field label="Quiz title" required>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={cn(inputClass, "h-10")}
                placeholder="e.g., Philippine History - Chapter 5"
              />
            </Field>
            <Field label="Description" hint="Optional. A short note for students.">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={cn(inputClass, "resize-none py-2.5")}
                placeholder="Brief description for students..."
              />
            </Field>
          </FormSection>

          <FormSection title="Timer" description="How long students have to finish.">
            <Field label="Timer type">
              <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                <ChoiceCard
                  selected={timerType === "PER_QUIZ"}
                  onSelect={() => setTimerType("PER_QUIZ")}
                  title="Per quiz"
                  description="One countdown for the whole quiz"
                />
                <ChoiceCard
                  selected={timerType === "PER_QUESTION"}
                  onSelect={() => setTimerType("PER_QUESTION")}
                  title="Per question"
                  description="Each question has its own countdown"
                />
              </div>
            </Field>
            <Field label={`Duration (${displayDuration})`} hint="Set minutes and seconds together.">
              <div className="grid max-w-xs grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(0, Number(e.target.value) || 0))}
                    min={0}
                    max={120}
                    aria-label="Minutes"
                    className={cn(inputClass, "h-10")}
                  />
                  <p className="mt-1 text-xs text-muted">Minutes</p>
                </div>
                <div>
                  <input
                    type="number"
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
                    min={0}
                    max={59}
                    aria-label="Seconds"
                    className={cn(inputClass, "h-10")}
                  />
                  <p className="mt-1 text-xs text-muted">Seconds</p>
                </div>
              </div>
            </Field>
          </FormSection>

          <FormSection title="Questions" description="Choose which questions from your bank appear in a session.">
            <div role="radiogroup" className="grid gap-2 md:grid-cols-3">
              <ChoiceCard
                selected={questionSelectionMode === "ALL"}
                onSelect={() => setQuestionSelectionMode("ALL")}
                title="Use all questions"
                description="Every bank item appears in the quiz"
              />
              <ChoiceCard
                selected={questionSelectionMode === "RANDOM"}
                onSelect={() => setQuestionSelectionMode("RANDOM")}
                title="Random draw"
                description="Pick a random subset from the bank"
              />
              <ChoiceCard
                selected={questionSelectionMode === "MANUAL"}
                onSelect={() => setQuestionSelectionMode("MANUAL")}
                title="Manual selection"
                description="You choose which bank items appear"
              />
            </div>

            {questionSelectionMode === "RANDOM" && (
              <div className="space-y-5 rounded-lg border border-border bg-surface p-4">
                <Field label="Questions to draw" hint="Example: if the bank has 20 questions, you can draw only 10.">
                  <input
                    type="number"
                    value={questionDrawCount}
                    onChange={(e) => setQuestionDrawCount(Math.max(1, Number(e.target.value) || 1))}
                    min={1}
                    max={500}
                    className={cn(inputClass, "h-10 max-w-[180px]")}
                  />
                </Field>
                <Field label="Random draw scope">
                  <div role="radiogroup" className="grid gap-2 md:grid-cols-2">
                    <ChoiceCard
                      selected={randomQuestionScope === "SESSION"}
                      onSelect={() => setRandomQuestionScope("SESSION")}
                      title="Same set per session"
                      description="All students in one session get the same subset"
                    />
                    <ChoiceCard
                      selected={randomQuestionScope === "PARTICIPANT"}
                      onSelect={() => setRandomQuestionScope("PARTICIPANT")}
                      title="Different set per student"
                      description="Each student gets their own random subset"
                    />
                  </div>
                </Field>
              </div>
            )}
          </FormSection>

          <FormSection title="Delivery and integrity" description="Control how the quiz is presented and monitored.">
            <ToggleRow
              checked={antiCheatEnabled}
              onChange={setAntiCheatEnabled}
              label="Anti-cheat monitoring"
              description="Flags fullscreen exits, tab switches, right-clicks, clipboard use, and devtools during live sessions."
            />
            <div className="border-t border-border/70" />
            <ToggleRow
              checked={randomizeQuestions}
              onChange={setRandomizeQuestions}
              label="Randomize question order"
              description="Useful when the quiz uses all or randomly drawn bank items."
            />
            <ToggleRow
              checked={randomizeAnswers}
              onChange={setRandomizeAnswers}
              label="Randomize answer choices"
              description="Answer options appear in a different order for each student."
            />
            <div className="border-t border-border/70" />
            <ToggleRow
              checked={!allowSkip}
              onChange={(value) => setAllowSkip(!value)}
              label="Disable question skipping"
              description="Students must answer in order and cannot jump ahead or go back."
            />
          </FormSection>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={() => router.back()} className={buttonSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={cn(buttonPrimary, "disabled:opacity-50")}>
              {loading ? "Creating..." : "Create quiz"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
