"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
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
  const [hasRecordedView, setHasRecordedView] = useState(false);
  const [viewerCount, setViewerCount] = useState<number | null>(null);
  const { data: session, status } = useSession();

  function play() {
    videoRef.current?.play().catch(() => {});
  }

  useEffect(() => {
    let active = true;

    async function loadViewerCount() {
      try {
        const response = await fetch("/api/video-views?videoId=quizph-promo");
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        setViewerCount(Number(data.totalViews ?? 0));
      } catch {
        // Ignore fetch failures for this informational badge.
      }
    }

    loadViewerCount();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || status !== "authenticated" || !session?.user?.id || !session?.user?.loginNonce || hasRecordedView) {
      return;
    }

    const handleTimeUpdate = () => {
      if (video.currentTime < 15 || hasRecordedView) return;
      setHasRecordedView(true);
      fetch("/api/video-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: "quizph-promo",
          watchedSeconds: Math.floor(video.currentTime),
          loginNonce: session.user.loginNonce,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            setHasRecordedView(false);
            return;
          }

          const data = await response.json();
          if (data?.counted) {
            setViewerCount((previous) => {
              const nextValue = Number(data.totalViews ?? 0);
              return previous == null ? nextValue : Math.max(previous + 1, nextValue);
            });
          }
        })
        .catch(() => {
          setHasRecordedView(false);
        });
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [hasRecordedView, session?.user?.id, session?.user?.loginNonce, status]);

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
          poster="/quizph-promo-thumb.png"
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

      {viewerCount !== null && (
        <div className="mt-2 flex items-center gap-1.5 px-1 text-[10px] font-medium text-muted/80">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.8]" aria-hidden="true">
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
          <span>{viewerCount}</span>
        </div>
      )}
    </section>
  );
}
