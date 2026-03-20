"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase().trim() }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }

    setMessage(data.message || "Check your email for a reset link.");
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-12 text-white bg-primary">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="font-black text-white text-sm">Q</span>
          </div>
          <span className="text-xl font-extrabold">QuizPH</span>
        </Link>

        <div>
          <h2 className="text-4xl font-extrabold leading-tight mb-6">
            Forgot your password? No worries.
          </h2>
          <p className="text-white/70 text-sm">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <p className="text-white/40 text-xs">
          © {new Date().getFullYear()} QuizPH. Built for Philippine educators.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary shadow-sm">
                <span className="text-white font-black text-sm">Q</span>
              </div>
              <span className="text-2xl font-extrabold text-foreground">QuizPH</span>
            </Link>
          </div>

          <h1 className="text-2xl font-extrabold text-foreground mb-1">Reset your password</h1>
          <p className="text-muted text-sm mb-8">
            Enter the email address associated with your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {message && (
              <div className="flex items-start gap-2.5 bg-success/6 border border-success/25 text-success text-sm p-3.5 rounded-xl">
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 bg-danger/6 border border-danger/25 text-danger text-sm p-3.5 rounded-xl">
                <svg className="mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>{error}</span>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-white font-semibold rounded-xl bg-primary transition disabled:opacity-50 text-sm shadow-sm hover:bg-primary/90"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Remember your password?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
