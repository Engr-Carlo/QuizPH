"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }

    router.push("/login?registered=true");
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex w-[42%] flex-col justify-between p-12 text-white"
        style={{ background: "linear-gradient(145deg, var(--primary) 0%, #4834d4 100%)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="font-black text-white text-sm">Q</span>
          </div>
          <span className="text-xl font-extrabold">QuizPH</span>
        </Link>

        <div>
          <h2 className="text-3xl font-extrabold leading-tight mb-4">
            Join thousands of Filipino educators using smarter assessments.
          </h2>
          <p className="text-white/75 text-sm leading-relaxed">
            Create your free account and start building quizzes with real-time anti-cheat monitoring today. No credit card required.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { icon: "🛡️", label: "Anti-cheat engine" },
              { icon: "📊", label: "Live monitoring" },
              { icon: "⚡", label: "Instant results" },
              { icon: "🎯", label: "Easy quiz builder" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-white/80 text-xs">
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/40 text-xs">
          © {new Date().getFullYear()} QuizPH. Built for Philippine educators.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white overflow-y-auto">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <Link href="/" className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
              >
                <span className="text-white font-black text-sm">Q</span>
              </div>
              <span className="text-2xl font-extrabold text-foreground">QuizPH</span>
            </Link>
          </div>

          <h1 className="text-2xl font-extrabold text-foreground mb-1">Create your account</h1>
          <p className="text-muted text-sm mb-8">Free forever. No credit card required.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 bg-danger/6 border border-danger/25 text-danger text-sm p-3.5 rounded-xl">
                <span className="mt-0.5 flex-shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Role selector */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {(["STUDENT", "TEACHER"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition ${
                      role === r
                        ? "border-primary bg-primary/6 text-primary"
                        : "border-border text-muted hover:border-primary/40"
                    }`}
                  >
                    {r === "STUDENT" ? "🎓 Student" : "👨‍🏫 Teacher"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted"
                placeholder="Juan dela Cruz"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted"
                placeholder="Min. 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-white font-semibold rounded-xl transition disabled:opacity-50 text-sm shadow-sm"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
            >
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
