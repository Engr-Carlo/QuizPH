"use client";

import { useRef, useState } from "react";

type DashboardVideoCardProps = {
  title: string;
  description?: string;
};

export function DashboardVideoCard({
  title,
  description = "Watch a short tour of the product flow and the student experience.",
}: DashboardVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayClick = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch {
      // Browser may block autoplay; leave the user to click the native controls.
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-border bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Video
        </span>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border bg-slate-950 shadow-sm">
        <video
          ref={videoRef}
          className="block w-full max-h-[220px] object-cover"
          src="/quizph-promo.mp4"
          playsInline
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {!isPlaying && (
          <button
            type="button"
            onClick={handlePlayClick}
            aria-label="Play video"
            className="absolute inset-0 flex items-center justify-center bg-slate-950/20 transition hover:bg-slate-950/10"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FF0033] shadow-[0_8px_28px_rgba(255,0,51,0.45)] ring-4 ring-white/20">
              <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-white" aria-hidden="true">
                <path d="M8 5v14l11-7-11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
