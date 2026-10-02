"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import SessionJoinQr from "@/components/SessionJoinQr";

interface SessionData {
  id: string;
  code: string;
  status: string;
}

const SESSION_STATUS_STYLE: Record<string, string> = {
  WAITING: "bg-amber-50 text-amber-700 border border-amber-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  ENDED: "bg-slate-100 text-slate-500 border border-slate-200",
};

export default function TeacherSessionQrPage() {
  const params = useParams<{ id: string; sessionId: string }>();
  const quizId = params.id as string;
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) {
          setSession(null);
          return;
        }

        const data = await res.json();
        setSession({
          id: data.id,
          code: data.code,
          status: data.status,
        });
      } catch {
        setSession(null);
      } finally {
        setLoading(false);
      }
    }

    void fetchSession();
  }, [sessionId]);

  async function copyCode() {
    if (!session?.code) return;
    await navigator.clipboard.writeText(session.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="rounded-2xl border border-border bg-card px-6 py-4 text-sm text-muted">
            Session not found.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4 py-10">
        <div className="w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_32px_80px_-20px_rgba(15,23,42,0.18)]">
          {/* Header strip with the session code front and center */}
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-primary/90 px-8 py-7 text-center">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${SESSION_STATUS_STYLE[session.status] || "bg-white/10 text-white border border-white/20"}`}
            >
              {session.status}
            </span>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.28em] text-white/55">
              Session Code
            </p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <span className="font-mono text-4xl font-black tracking-[0.26em] text-white sm:text-5xl">
                {session.code}
              </span>
              <button
                type="button"
                onClick={copyCode}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                title="Copy code"
              >
                {copied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* QR body */}
          <div className="flex flex-col items-center px-8 py-10">
            <p className="mb-6 text-sm font-medium text-slate-500">Scan with a phone camera to join</p>
            <SessionJoinQr code={session.code} size={300} compact />

            <Link
              href={`/teacher/quiz/${quizId}/monitor/${sessionId}`}
              className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90"
            >
              Open Lobby
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
