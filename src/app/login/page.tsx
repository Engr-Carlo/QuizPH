"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [previewCode, setPreviewCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailFromQuery = params.get("email");
    if (emailFromQuery) setEmail(emailFromQuery);

    if (params.get("verified") === "true") {
      setInfo("Email verified successfully. You can sign in now.");
      return;
    }

    if (params.get("registered") === "true") {
      setInfo("Account created. Please verify your email before signing in.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setShowResend(false);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      const statusRes = await fetch("/api/email-verification/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const statusData = await statusRes.json();

      if (statusData.exists && !statusData.verified) {
        setError("Your email is not verified yet. Please verify your email first.");
        setShowResend(true);
      } else {
        setError("Invalid email or password. Please try again.");
      }
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role;

    if (role === "SUPER_ADMIN") router.push("/admin");
    else if (role === "TEACHER") router.push("/teacher");
    else router.push("/student");
  }

  async function handleResendCode() {
    if (!email) {
      setError("Please enter your email first.");
      return;
    }

    setError("");
    setInfo("");
    setResendLoading(true);

    const res = await fetch("/api/email-verification/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    setResendLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to resend verification code.");
      return;
    }

    setInfo(data.message || "Verification code sent.");
    if (data.previewCode) setPreviewCode(data.previewCode);
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex w-[45%] flex-col justify-between p-12 text-white bg-primary"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="font-black text-white text-sm">Q</span>
          </div>
          <span className="text-xl font-extrabold">QuizPH</span>
        </Link>

        {/* Main copy */}
        <div>
          <h2 className="text-4xl font-extrabold leading-tight mb-6">
            Run fair, engaging assessments with confidence.
          </h2>
          <ul className="space-y-3">
            {[
              "Real-time anti-cheat monitoring",
              "Live leaderboard & violation alerts",
              "Instant auto-graded results",
              "Easy quiz builder for any question type",
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-white/85 text-sm">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-white/40 text-xs">
          © {new Date().getFullYear()} QuizPH. Built for Philippine educators.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <Link href="/" className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary shadow-sm"
              >
                <span className="text-white font-black text-sm">Q</span>
              </div>
              <span className="text-2xl font-extrabold text-foreground">QuizPH</span>
            </Link>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-extrabold text-foreground mb-1">Welcome back</h1>
          <p className="text-muted text-sm mb-8">Sign in to your account to continue</p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {info && (
              <div className="flex items-start gap-2.5 bg-success/6 border border-success/25 text-success text-sm p-3.5 rounded-xl">
                <span>{info}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 bg-danger/6 border border-danger/25 text-danger text-sm p-3.5 rounded-xl">
                <svg className="mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {previewCode && (
              <div className="bg-warning/8 border border-warning/30 text-warning text-sm p-3.5 rounded-xl">
                Dev preview code: <span className="font-bold tracking-[0.2em]">{previewCode}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Email address
              </label>
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
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-white font-semibold rounded-xl bg-primary transition disabled:opacity-50 text-sm shadow-sm hover:bg-primary/90"
            >
              {loading ? "Signing in..." : "Sign In ->"}
            </button>

            {showResend && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendLoading}
                  className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  {resendLoading ? "Sending..." : "Resend verification code"}
                </button>

                <Link href={`/verify-email?email=${encodeURIComponent(email)}`} className="text-sm text-muted hover:text-foreground transition">
                  Verify email
                </Link>
              </div>
            )}
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
