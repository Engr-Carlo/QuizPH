"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function DashboardVideoCard({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function play() {
    videoRef.current?.play().catch(() => {});
  }

  return (
    <section className={cn("rounded-xl border border-border bg-white p-3 shadow-sm", className)}>
      <div className="mb-2.5 px-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>

      <div className="group relative aspect-video overflow-hidden rounded-lg bg-ink">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-contain"
          src="/quizph-promo.mp4"
          controls={isPlaying}
          playsInline
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {!isPlaying && (
          <button
            type="button"
            onClick={play}
            aria-label="Play video"
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-ink/60 via-ink/10 to-transparent"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-ink shadow-lg ring-8 ring-white/20 transition duration-200 group-hover:scale-105 group-hover:bg-white">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true">
                <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
              </svg>
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
