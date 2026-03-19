"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [previewCode, setPreviewCode] = useState("");
  const [deliveryWarning, setDeliveryWarning] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") || "");
    setPreviewCode(params.get("previewCode") || "");
    if (params.get("deliveryFailed") === "true") {
      setDeliveryWarning("We could not send the verification email right now. Please try resending the code in a moment.");
    }
  }, []);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const res = await fetch("/api/email-verification/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Verification failed");
      return;
    }

    setSuccess("Email verified. You can now sign in.");
    setTimeout(() => {
      router.push(`/login?verified=true&email=${encodeURIComponent(email)}`);
    }, 900);
  }

  async function handleResend() {
    setError("");
    setSuccess("");
    setResending(true);

    const res = await fetch("/api/email-verification/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setResending(false);

    if (!res.ok) {
      setError(data.error || "Failed to resend code");
      if (data.previewCode) {
        setPreviewCode(data.previewCode);
      }
      return;
    }

    setSuccess(data.message || "Verification code sent");
    setDeliveryWarning("");
    if (data.previewCode) {
      setPreviewCode(data.previewCode);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-white">
      <div className="w-full max-w-[430px] border border-border rounded-2xl bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold text-foreground mb-1">Verify your email</h1>
        <p className="text-sm text-muted mb-6">Enter the 6-digit code sent to your email.</p>

        {(error || success) && (
          <div className={`mb-4 rounded-xl border px-3.5 py-2.5 text-sm ${error ? "border-danger/25 bg-danger/6 text-danger" : "border-success/25 bg-success/6 text-success"}`}>
            {error || success}
          </div>
        )}

        {deliveryWarning && (
          <div className="mb-4 rounded-xl border border-warning/30 bg-warning/8 px-3.5 py-2.5 text-sm text-warning">
            {deliveryWarning}
          </div>
        )}

        {previewCode && (
          <div className="mb-4 rounded-xl border border-warning/30 bg-warning/8 px-3.5 py-2.5 text-sm text-warning">
            Dev preview code: <span className="font-bold tracking-[0.2em]">{previewCode}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white tracking-[0.25em] font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-white font-semibold rounded-xl transition disabled:opacity-50 text-sm shadow-sm"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={!email || resending}
            className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
          >
            {resending ? "Sending..." : "Resend code"}
          </button>

          <Link href="/login" className="text-sm text-muted hover:text-foreground transition">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
