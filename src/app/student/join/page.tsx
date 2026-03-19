"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

export default function JoinQuizPage() {
  const router = useRouter();
  const [chars, setChars] = useState(Array(6).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const code = chars.join("");

  function handleChar(idx: number, val: string) {
    const c = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-1);
    const next = [...chars];
    next[idx] = c;
    setChars(next);
    if (c && idx < 5) inputs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !chars[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    const next = Array(6).fill("");
    text.split("").forEach((c, i) => { next[i] = c; });
    setChars(next);
    inputs.current[Math.min(text.length, 5)]?.focus();
    e.preventDefault();
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) return;
    setError("");
    setLoading(true);

    const res = await fetch("/api/sessions/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to join quiz");
      return;
    }

    // Show violation warning before entering quiz
    setPendingUrl(`/student/quiz/${data.session.id}?participantId=${data.participant.id}`);
  }

  return (
    <DashboardLayout>
      {/* Violation warning modal — shown after successful join, before entering quiz */}
      {pendingUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h2 className="text-center text-xl font-black text-foreground mb-1">Academic Integrity Notice</h2>
            <p className="text-center text-sm text-muted mb-5">
              Read carefully before entering the quiz.
            </p>
            <ul className="space-y-2.5 mb-6 text-sm text-foreground">
              {[
                "Leaving fullscreen or switching tabs will be logged as a violation.",
                "Copying, pasting, or right-clicking is disabled during the quiz.",
                "Your teacher is notified in real time of any suspicious activity.",
                "Violations are permanently recorded and visible on your result.",
                "Any attempt to cheat may result in disqualification.",
              ].map((rule) => (
                <li key={rule} className="flex items-start gap-2.5 rounded-2xl bg-surface px-3.5 py-2.5">
                  <svg className="mt-0.5 flex-shrink-0 text-danger" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push(pendingUrl)}
              className="w-full rounded-2xl bg-primary py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-primary/90"
            >
              I Understand — Enter Quiz
            </button>
            <button
              onClick={() => setPendingUrl(null)}
              className="mt-3 w-full rounded-2xl border border-border py-3 text-sm font-semibold text-muted transition hover:bg-surface"
            >
              Go Back
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="overflow-hidden rounded-[28px] bg-primary px-5 py-6 text-white shadow-lg sm:px-7 sm:py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">Join session</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Enter your code and jump straight in.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/78 sm:text-base">
            Built for phones first: bigger inputs, cleaner spacing, and faster one-hand entry before fullscreen starts.
          </p>
        </div>

        <form onSubmit={handleJoin} className="rounded-[28px] border border-border/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur sm:p-7">
          {error && (
            <div className="flex items-start gap-2 bg-danger/6 border border-danger/25 text-danger text-sm p-3.5 rounded-xl mb-5">
              <svg className="mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Quiz access</p>
              <h2 className="mt-1 text-xl font-black text-foreground">Use the 6-character session code</h2>
            </div>
            <div className="hidden rounded-2xl bg-primary/8 px-3 py-2 text-xs font-bold text-primary sm:block">
              Fast join
            </div>
          </div>

          {/* Character boxes */}
          <div className="grid grid-cols-3 gap-3 sm:flex sm:justify-center mb-6" onPaste={handlePaste}>
            {chars.map((c, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                type="text"
                inputMode="text"
                value={c}
                onChange={(e) => handleChar(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                maxLength={2}
                className={`h-15 w-full text-center text-2xl font-extrabold font-mono uppercase rounded-2xl border-2 transition focus:outline-none focus:ring-2 focus:ring-primary/30 sm:h-16 sm:w-14 ${
                  c
                    ? "border-primary bg-primary/6 text-primary"
                    : "border-border bg-surface text-foreground"
                }`}
                placeholder="·"
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full rounded-2xl py-3.5 text-base font-black text-white bg-primary shadow-sm transition disabled:opacity-40 hover:-translate-y-0.5 hover:bg-primary/90"
          >
            {loading ? "Joining..." : "Join Quiz"}
          </button>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              "Fullscreen starts when the quiz begins.",
              "Tap-friendly layout is optimized for phones.",
              "Your teacher can monitor violations live.",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 px-3 py-3 text-xs leading-5 text-muted">
                {item}
              </div>
            ))}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
