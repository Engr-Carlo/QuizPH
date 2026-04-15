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
  const [showPassword, setShowPassword] = useState(false);

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
      email: email.toLowerCase().trim(),
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
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Full-bleed background */}
      <img
        src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=1600&q=80"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Gradient overlay — darker on right where form is, lighter on left */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/75 to-slate-950/88" />

      {/* Left branding panel */}
      <div className="relative hidden lg:flex flex-col justify-between w-[54%] p-14 text-white">
        <Link href="/" className="flex items-center gap-2.5 w-fit">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/12 border border-white/20 backdrop-blur-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <polyline points="9 13 11 15 15 11" />
            </svg>
          </div>
          <span className="text-xl font-extrabold tracking-tight">QuizPH</span>
        </Link>

        <div className="space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50 mb-4">For Philippine educators</p>
            <h2 className="text-4xl font-black leading-[1.15] text-white mb-5">
              Run fair,<br />engaging quizzes<br />with confidence.
            </h2>
            <p className="text-white/55 text-sm leading-relaxed max-w-sm">
              Real-time anti-cheat, live leaderboards, and automatic grading — everything you need in one classroom-ready platform.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              "Fullscreen + tab-switch anti-cheat monitoring",
              "Live score & violation dashboard",
              "MCQ, True/False, Short Answer & Math types",
              "Student joins with a simple 6-digit code",
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-white/75 text-sm">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-white/25 text-xs">
          © {new Date().getFullYear()} QuizPH. Built for Philippine educators.
        </p>
      </div>

      {/* Right: form card */}
      <div className="relative flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] p-8 lg:p-9">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-900">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <polyline points="9 13 11 15 15 11" />
                </svg>
              </div>
              <span className="text-xl font-extrabold text-slate-900">QuizPH</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Welcome back</h1>
            <p className="text-slate-500 text-sm">Sign in to your account to continue</p>
          </div>

          {/* Alerts */}
          {info && (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3.5 rounded-2xl mb-5">
              <svg className="mt-0.5 flex-shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>{info}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 text-sm p-3.5 rounded-2xl mb-5">
              <svg className="mt-0.5 flex-shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {previewCode && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm p-3.5 rounded-2xl mb-5">
              Dev preview code: <span className="font-bold tracking-[0.2em]">{previewCode}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition placeholder:text-slate-400"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-primary font-medium hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition placeholder:text-slate-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white font-bold rounded-xl bg-primary transition disabled:opacity-50 text-sm shadow-sm hover:bg-primary/90 mt-1"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            {showResend && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendLoading}
                  className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  {resendLoading ? "Sending…" : "Resend verification email"}
                </button>
                <Link href={`/verify-email?email=${encodeURIComponent(email)}`} className="text-sm text-slate-500 hover:text-slate-800 transition">
                  Verify email
                </Link>
              </div>
            )}
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
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
