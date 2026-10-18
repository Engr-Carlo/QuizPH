"use client";

import { useEffect, useState } from "react";

export default function WelcomeVideoModal({ userId }: { userId: string }) {
  const storageKey = `quizph:welcome-video:${userId}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) setOpen(true);
    } catch {
      // Storage blocked (private mode) — skip rather than showing on every page load
    }
  }, [storageKey]);

  function close() {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {}
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[20px] bg-card border border-border shadow-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4 border-b border-border">
          <div>
            <span className="inline-block mb-2 text-[10px] font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              Welcome
            </span>
            <h2 className="text-lg font-extrabold text-foreground leading-snug">Welcome to QuizPH</h2>
            <p className="text-sm text-muted">Watch a quick tour of how everything works.</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="h-8 w-8 flex-shrink-0 rounded-lg text-muted hover:bg-surface hover:text-foreground transition"
          >
            &times;
          </button>
        </div>

        <div className="bg-slate-950">
          <video
            className="w-full aspect-video"
            src="/quizph-promo.mp4"
            controls
            autoPlay
            muted
            playsInline
            preload="metadata"
          />
        </div>

        <div className="px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={close}
            className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition"
          >
            Skip, go to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
