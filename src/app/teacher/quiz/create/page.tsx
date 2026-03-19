"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

export default function CreateQuizPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
  const [preventScreenshots, setPreventScreenshots] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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
        preventScreenshots,
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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href="/teacher" className="hover:text-foreground transition">My Quizzes</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Create Quiz</span>
      </div>

      <div className="max-w-2xl">
        <h1 className="text-2xl font-extrabold text-foreground mb-1">Create New Quiz</h1>
        <p className="text-muted text-sm mb-8">Configure your quiz settings. You can add questions after creating it.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 bg-danger/6 border border-danger/25 text-danger text-sm p-3.5 rounded-xl">
              <svg className="mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Card: Basic info */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4">Basic Info</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Quiz Title <span className="text-danger">*</span></label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted"
                  placeholder="e.g., Philippine History - Chapter 5"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Description <span className="text-muted font-normal">(optional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none placeholder:text-muted"
                  placeholder="Brief description for students..."
                />
              </div>
            </div>
          </div>

          {/* Card: Timer settings */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4">Timer Settings</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Timer Type</label>
                <div className="grid grid-cols-1 gap-2">
                  {(["PER_QUIZ", "PER_QUESTION"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTimerType(t)}
                      className={`px-4 py-2.5 text-sm font-medium rounded-xl border-2 text-left transition ${
                        timerType === t
                          ? "border-primary bg-primary/6 text-primary"
                          : "border-border text-muted hover:border-primary/40"
                      }`}
                    >
                      {t === "PER_QUIZ" ? "Per quiz (total time)" : "Per question"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Duration
                  <span className="ml-2 text-primary font-bold">{displayDuration}</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Math.max(0, Number(e.target.value) || 0))}
                      min={0}
                      max={120}
                      className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                    <p className="text-xs text-muted mt-1">Minutes</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={durationSeconds}
                      onChange={(e) => setDurationSeconds(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
                      min={0}
                      max={59}
                      className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                    <p className="text-xs text-muted mt-1">Seconds</p>
                  </div>
                </div>
                <p className="text-xs text-muted mt-2">Use minutes and seconds together instead of raw total seconds.</p>
              </div>
            </div>
          </div>

          {/* Card: Quiz settings */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4">Quiz Settings</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Question Bank Mode</label>
                <div className="grid md:grid-cols-3 gap-2">
                  {([
                    { value: "ALL", label: "Use all questions", desc: "Every bank item appears in the quiz" },
                    { value: "RANDOM", label: "Random draw", desc: "Pick a random subset from the bank" },
                    { value: "MANUAL", label: "Manual selection", desc: "Teacher chooses which bank items appear" },
                  ] as const).map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setQuestionSelectionMode(item.value)}
                      className={`p-3 rounded-xl border-2 text-left transition ${
                        questionSelectionMode === item.value
                          ? "border-primary bg-primary/6 text-primary"
                          : "border-border text-muted hover:border-primary/40"
                      }`}
                    >
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-xs mt-1">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {questionSelectionMode === "RANDOM" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Questions to draw</label>
                    <input
                      type="number"
                      value={questionDrawCount}
                      onChange={(e) => setQuestionDrawCount(Math.max(1, Number(e.target.value) || 1))}
                      min={1}
                      max={500}
                      className="w-full max-w-[200px] px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                    <p className="text-xs text-muted mt-1">Example: if the bank has 20 questions, you can draw only 10.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Random draw scope</label>
                    <div className="grid md:grid-cols-2 gap-2">
                      {([
                        { value: "SESSION", label: "Same set per session", desc: "All students in one session get the same random subset" },
                        { value: "PARTICIPANT", label: "Different set per student", desc: "Each student gets their own random subset" },
                      ] as const).map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setRandomQuestionScope(item.value)}
                          className={`p-3 rounded-xl border-2 text-left transition ${
                            randomQuestionScope === item.value
                              ? "border-primary bg-primary/6 text-primary"
                              : "border-border text-muted hover:border-primary/40"
                          }`}
                        >
                          <p className="text-sm font-semibold">{item.label}</p>
                          <p className="text-xs mt-1">{item.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-warning/25 bg-warning/6 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Anti-cheat monitor</p>
                    <p className="text-xs text-muted mt-1">Premium feature. Offer it as a limited-time upgrade teaser for teachers.</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-semibold text-warning">Premium trial</span>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group rounded-xl hover:bg-white/60 p-2 -m-2 transition">
                  <input
                    type="checkbox"
                    checked={antiCheatEnabled}
                    onChange={(e) => setAntiCheatEnabled(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Enable anti-cheat monitoring</p>
                    <p className="text-xs text-muted">Fullscreen, tab-switch, right-click, clipboard, and devtools detection during quiz sessions.</p>
                  </div>
                </label>
              </div>

              <div className="space-y-3">
                {[
                  { key: "randomizeQuestions", label: "Randomize delivered question order", desc: "Useful when the quiz uses all or randomly drawn bank items", checked: randomizeQuestions, set: setRandomizeQuestions },
                  { key: "randomizeAnswers", label: "Randomize answer choices", desc: "Answer options appear in a different order for students", checked: randomizeAnswers, set: setRandomizeAnswers },
                  { key: "preventScreenshots", label: "Prevent screenshots", desc: "Detect screenshot key presses and black out the screen, logging each attempt as a violation.", checked: preventScreenshots, set: setPreventScreenshots },
                ].map(({ key, label, desc, checked, set }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl hover:bg-surface transition">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => set(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                        checked ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"
                      }`}>
                        {checked && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-white font-semibold text-sm rounded-xl shadow-sm transition disabled:opacity-50 hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
            >
              {loading ? "Creating..." : "Create Quiz"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-border text-muted text-sm rounded-xl hover:bg-surface transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
