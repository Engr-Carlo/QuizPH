"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export default function PresenceHeartbeat() {
  const { status } = useSession();
  const lastTouchRef = useRef(0);

  const touchPresence = useCallback(async () => {
    const now = Date.now();
    if (now - lastTouchRef.current < 30_000) {
      return;
    }
    lastTouchRef.current = now;

    try {
      await fetch("/api/presence", {
        method: "POST",
        cache: "no-store",
        keepalive: true,
      });
    } catch {
      // Ignore transient network errors. The 5-minute activity window is still based on the last successful signal.
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    void touchPresence();

    const handleActivity = () => {
      void touchPresence();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void touchPresence();
      }
    };

    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    window.addEventListener("focus", handleActivity);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("focus", handleActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status, touchPresence]);

  return null;
}