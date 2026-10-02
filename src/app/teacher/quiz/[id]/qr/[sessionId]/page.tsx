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

export default function TeacherSessionQrPage() {
  const params = useParams<{ id: string; sessionId: string }>();
  const quizId = params.id as string;
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 py-10">
        <div className="w-full rounded-[32px] border border-border bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Session QR</p>
            <h1 className="mt-3 text-3xl font-black text-foreground">Share the join code</h1>
            <p className="mt-2 text-sm text-muted">Students can scan this QR to join instantly.</p>
          </div>

          <div className="flex justify-center">
            <SessionJoinQr code={session.code} size={420} compact />
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href={`/teacher/quiz/${quizId}/monitor/${sessionId}`}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-primary/90"
            >
              Open Lobby
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
