"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

export default function JoinQuizPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/sessions/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.toUpperCase() }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to join");
      return;
    }

    router.push(`/student/quiz/${data.session.id}?participantId=${data.participant.id}`);
  }

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-center">Join a Quiz</h1>
        <p className="text-muted text-center mb-8">
          Enter the 6-character code from your teacher
        </p>

        <form
          onSubmit={handleJoin}
          className="bg-card border border-border rounded-2xl p-8 space-y-5"
        >
          {error && (
            <div className="bg-danger/10 text-danger text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              maxLength={6}
              required
              className="w-full px-6 py-4 text-center text-3xl font-mono font-bold tracking-[0.5em] border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary uppercase"
              placeholder="------"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition disabled:opacity-50 text-lg"
          >
            {loading ? "Joining..." : "Join Quiz"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
