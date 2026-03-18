"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import WarningModal from "./WarningModal";

interface AntiCheatContextType {
  warningCount: number;
  isWarningVisible: boolean;
}

const AntiCheatContext = createContext<AntiCheatContextType>({
  warningCount: 0,
  isWarningVisible: false,
});

export function useAntiCheat() {
  return useContext(AntiCheatContext);
}

interface AntiCheatProviderProps {
  children: ReactNode;
  participantId: string;
  sessionId: string;
  active: boolean;
}

export default function AntiCheatProvider({
  children,
  participantId,
  sessionId,
  active,
}: AntiCheatProviderProps) {
  const [warningVisible, setWarningVisible] = useState(false);
  const [warningCount, setWarningCount] = useState(0);

  const logViolation = useCallback(
    async (type: string) => {
      if (!participantId || !sessionId) return;
      try {
        await fetch("/api/violations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId, sessionId, type }),
        });
      } catch {
        // Silently fail — violation logging shouldn't crash quiz
      }
    },
    [participantId, sessionId]
  );

  const showWarning = useCallback((type: string) => {
    setWarningVisible(true);
    setWarningCount((c) => c + 1);
    logViolation(type);
  }, [logViolation]);

  // 1. Fullscreen enforcement
  useEffect(() => {
    if (!active) return;

    const enterFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Browser may block if not triggered by user gesture
      }
    };

    enterFullscreen();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        showWarning("FULLSCREEN_EXIT");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [active, showWarning]);

  // 2. Tab switch / visibility detection
  useEffect(() => {
    if (!active) return;

    const handleVisibility = () => {
      if (document.hidden) {
        showWarning("TAB_SWITCH");
      }
    };

    const handleBlur = () => {
      showWarning("TAB_SWITCH");
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [active, showWarning]);

  // 3. Copy-paste prevention
  useEffect(() => {
    if (!active) return;

    const prevent = (e: ClipboardEvent) => {
      e.preventDefault();
      logViolation("COPY_PASTE");
    };

    document.addEventListener("copy", prevent);
    document.addEventListener("paste", prevent);
    document.addEventListener("cut", prevent);
    return () => {
      document.removeEventListener("copy", prevent);
      document.removeEventListener("paste", prevent);
      document.removeEventListener("cut", prevent);
    };
  }, [active, logViolation]);

  // 4. Right-click prevention
  useEffect(() => {
    if (!active) return;

    const prevent = (e: MouseEvent) => {
      e.preventDefault();
      logViolation("RIGHT_CLICK");
    };

    document.addEventListener("contextmenu", prevent);
    return () => document.removeEventListener("contextmenu", prevent);
  }, [active, logViolation]);

  // 5. DevTools detection
  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        logViolation("DEVTOOLS");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [active, logViolation]);

  function handleReenterFullscreen() {
    setWarningVisible(false);
    document.documentElement.requestFullscreen().catch(() => {});
  }

  return (
    <AntiCheatContext.Provider
      value={{ warningCount, isWarningVisible: warningVisible }}
    >
      {warningVisible && (
        <WarningModal
          warningCount={warningCount}
          onReenterFullscreen={handleReenterFullscreen}
        />
      )}
      {children}
    </AntiCheatContext.Provider>
  );
}
