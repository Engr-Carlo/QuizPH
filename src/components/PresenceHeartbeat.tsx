"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export default function PresenceHeartbeat() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const touchPresence = async () => {
      try {
        await fetch("/api/presence", {
          method: "POST",
          cache: "no-store",
          keepalive: true,
        });
      } catch {
        // No periodic polling anymore.
      }
    };

    touchPresence();
  }, [status]);

  return null;
}