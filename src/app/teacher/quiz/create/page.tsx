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
  const [duration, setDuration] = useState(300);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeAnswers, setRandomizeAnswers] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: description || undefined, timerType, duration, randomizeQuestions, randomizeAnswers }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create quiz");
      return;
    }

    router.push(`/teacher/quiz/${data.id}`);
  }

  const displayDuration = `${Math.floor(duration / 60)} min${duration % 60 ? ` ${duration % 60}s` : ""}`;

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
              <span className="mt-0.5">âš ï¸</span>
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
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={10}
                  max={7200}
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
                <p className="text-xs text-muted mt-1">Enter duration in seconds</p>
              </div>
            </div>
          </div>

          {/* Card: Options */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4">Quiz Options</h2>
            <div className="space-y-3">
              {[
                { key: "randomizeQuestions", label: "Randomize question order", desc: "Each student gets questions in a different order", checked: randomizeQuestions, set: setRandomizeQuestions },
                { key: "randomizeAnswers", label: "Randomize answer choices", desc: "Answer options appear in a random order", checked: randomizeAnswers, set: setRandomizeAnswers },
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
                      {checked && <span className="text-white text-xs font-black">✓</span>}
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
