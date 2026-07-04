"use client";

import { useMemo, useState } from "react";
import { sanitizeHtml } from "@/lib/sanitize";

interface Props {
  noteId: string;
  title: string;
  body: string;
  onDismiss: () => void;
}

export default function PatchNoteModal({ noteId, title, body, onDismiss }: Props) {
  const [dismissing, setDismissing] = useState(false);
  const safeBody = useMemo(() => sanitizeHtml(body), [body]);

  async function handleDismiss() {
    setDismissing(true);
    try {
      const res = await fetch(`/api/patch-notes/${noteId}/read`, { method: "POST" });
      if (!res.ok) {
        // Mark-as-read failed — don't close so the modal doesn't reappear next load
        console.error("Failed to mark patch note as read");
        setDismissing(false);
        return;
      }
    } catch {
      // Network error — don't close to avoid the modal reappearing on next visit
      setDismissing(false);
      return;
    }
    onDismiss();
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-[20px] bg-card border border-border shadow-2xl overflow-hidden"
        style={{ animation: "pnm-in 0.22s ease" }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <span className="inline-block mb-2 text-[10px] font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
            What&rsquo;s New
          </span>
          <h2 className="text-xl font-extrabold text-foreground leading-snug">{title}</h2>
        </div>

        {/* Body — sanitized before rendering to prevent XSS */}
        <div className="px-6 py-5 max-h-72 overflow-y-auto">
          <div
            className="text-sm text-foreground/80 leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_a]:text-primary [&_a]:underline [&_strong]:font-bold [&_em]:italic"
            dangerouslySetInnerHTML={{ __html: safeBody }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end">
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 shadow-[0_2px_10px_rgba(37,99,235,0.35)]"
          >
            {dismissing ? "Saving…" : "Got it, thanks!"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pnm-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
