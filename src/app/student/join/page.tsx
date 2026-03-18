"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

export default function JoinQuizPage() {
  const router = useRouter();
  const [chars, setChars] = useState(Array(6).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

    router.push(`/student/quiz/${data.session.id}?participantId=${data.participant.id}`);
  }

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto">
        {/* Page heading */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎯</div>
          <h1 className="text-2xl font-extrabold text-foreground mb-2">Join a Quiz</h1>
          <p className="text-muted text-sm">Enter the 6-character code from your teacher</p>
        </div>

        <form onSubmit={handleJoin} className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          {error && (
            <div className="flex items-start gap-2 bg-danger/6 border border-danger/25 text-danger text-sm p-3.5 rounded-xl mb-5">
              <span className="mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Character boxes */}
          <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
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
                className={`w-12 h-14 text-center text-2xl font-extrabold font-mono uppercase rounded-xl border-2 transition focus:outline-none focus:ring-2 focus:ring-primary/30 ${
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
            className="w-full py-3 text-white font-bold rounded-xl transition disabled:opacity-40 text-base hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
          >
            {loading ? "Joining…" : "Join Quiz →"}
          </button>

          <p className="text-center text-xs text-muted mt-4">
            The quiz will open in fullscreen once you join.
          </p>
        </form>
      </div>
    </DashboardLayout>
  );
}
