"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

const HEARTBEAT_MS = 60_000;

export default function PresenceHeartbeat() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let isSending = false;

    const sendHeartbeat = async () => {
      if (isSending || document.hidden) {
        return;
      }

      isSending = true;
      try {
        await fetch("/api/presence", {
          method: "POST",
          cache: "no-store",
          keepalive: true,
        });
      } catch {
        // Presence should never block the UI.
      } finally {
        isSending = false;
      }
    };

    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, HEARTBEAT_MS);
    const handleFocus = () => {
      sendHeartbeat();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [status]);

  return null;
}