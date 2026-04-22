"use client";

import { Suspense } from "react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getPusherClient } from "@/lib/pusher-client";
import { formatTime, shuffleArray } from "@/lib/utils";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  type: string;
  text: string;
  options: Option[];
}

interface SessionData {
  id: string;
  code: string;
  status: string;
  resumeData: {
    timeLeft: number;
    lastQuestionIndex: number;
    timerEndsAt: string | null;
    isFinished?: boolean;
    score?: number | null;
  } | null;
  quiz: {
    title: string;
    duration: number;
    timerType: string;
    activeQuestionCount: number;
    randomizeQuestions: boolean;
    randomizeAnswers: boolean;
    antiCheatEnabled: boolean;
    allowSkip: boolean;
    questions: Question[];
  };
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ: "Multiple Choice",
  TRUE_FALSE: "True or False",
  SHORT_ANSWER: "Short Answer",
  MATH: "Math Problem",
};

function getTimeLeftFromEndsAt(timerEndsAt: string | null, fallback: number) {
  if (!timerEndsAt) {
    return fallback;
  }

  return Math.max(0, Math.ceil((new Date(timerEndsAt).getTime() - Date.now()) / 1000));
}

function StudentQuizContent() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const searchParams = useSearchParams();
  const participantId = searchParams.get("participantId") ?? "";

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"waiting" | "active" | "finished">("waiting");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [perQuestionTimeLeft, setPerQuestionTimeLeft] = useState(0);
  const [timerEndsAt, setTimerEndsAt] = useState<string | null>(null);
  const [warningVisible, setWarningVisible] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const isSubmittingRef = useRef(false);
  const hasFinishedRef = useRef(false);
  const timeWarningShownRef = useRef(false);
  const questionsInitializedRef = useRef(false);
  const questionTimerRemainingRef = useRef<Record<string, number>>({});
  const focusLostRef = useRef(false); // tracks focus state without stale-closure risk
  const antiCheatEnabledRef = useRef(false); // mirrors sessionData.quiz.antiCheatEnabled as a ref
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [focusLost, setFocusLost] = useState(false);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);
  const [secureModeError, setSecureModeError] = useState<string | null>(null);
  const [lockedQuestionIds, setLockedQuestionIds] = useState<Set<string>>(new Set());

  // ── Fake biometrics (psychological pressure display) ──────────────────
  const [heartRate, setHeartRate] = useState(78);
  const [spo2, setSpo2] = useState(98);
  const heartRateRef = useRef(78);
  const timeLeftRef = useRef(0);

  // Restore timer state from sessionStorage on mount — prevents timer flash on refresh
  useEffect(() => {
    if (!participantId) return;
    const cached = sessionStorage.getItem(`timerEndsAt:${participantId}`);
    if (cached) {
      setTimerEndsAt(cached);
      setTimeLeft(getTimeLeftFromEndsAt(cached, 0));
    }
    const lockedRaw = sessionStorage.getItem(`qtimerLocked:${participantId}`);
    if (lockedRaw) {
      try { setLockedQuestionIds(new Set(JSON.parse(lockedRaw))); } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    // Never reset the UI once the student has submitted
    if (hasFinishedRef.current) return;

    const query = participantId ? `?participantId=${encodeURIComponent(participantId)}` : "";
    const res = await fetch(`/api/sessions/${sessionId}${query}`);
    if (res.ok) {
      const data: SessionData = await res.json();
      setSessionData(data);

      if (data.status === "ACTIVE") {
        // If participant already submitted, show finished screen — never re-enter the quiz
        if (data.resumeData?.isFinished) {
          hasFinishedRef.current = true;
          if (data.resumeData.score !== undefined && data.resumeData.score !== null) {
            setScore(data.resumeData.score);
          }
          setStatus("finished");
          setLoading(false);
          return;
        }

        // Initialize questions only once per page load — re-fetching on tab switch
        // must not re-shuffle, otherwise answers map to wrong questions
        if (!questionsInitializedRef.current) {
          let qs = data.quiz.questions;
          if (data.quiz.randomizeQuestions) qs = shuffleArray(qs);
          if (data.quiz.randomizeAnswers) {
            qs = qs.map((q) => ({
              ...q,
              options: shuffleArray(q.options),
            }));
          }
          // Remove isCorrect from options sent to client
          qs = qs.map((q) => ({
            ...q,
            options: q.options.map(({ id, text }) => ({ id, text })),
          }));
          questionsInitializedRef.current = true;
          setQuestions(qs);

          // Resume: jump back to where the student left off
          const resumeIndex = data.resumeData?.lastQuestionIndex ?? 0;
          setCurrentIndex(Math.min(resumeIndex, qs.length - 1));
        }

        setStatus("active");

        // Always re-sync timer — returning from a tab switch must show correct remaining time
        const serverTimeLeft = data.resumeData?.timeLeft ?? data.quiz.duration;
        const nextTimerEndsAt = data.resumeData?.timerEndsAt ?? null;
        setTimerEndsAt(nextTimerEndsAt);
        setTimeLeft(getTimeLeftFromEndsAt(nextTimerEndsAt, serverTimeLeft));
        // Cache for instant display on next refresh (prevents 0-flash)
        if (nextTimerEndsAt && participantId) {
          sessionStorage.setItem(`timerEndsAt:${participantId}`, nextTimerEndsAt);
        }
      } else if (data.status === "ENDED") {
        hasFinishedRef.current = true;
        setStatus("finished");
      }
    }
    setLoading(false);
  }, [participantId, sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    const syncFromServer = () => {
      if (!document.hidden) {
        fetchSession();
      }
    };

    document.addEventListener("visibilitychange", syncFromServer);
    window.addEventListener("focus", syncFromServer);

    return () => {
      document.removeEventListener("visibilitychange", syncFromServer);
      window.removeEventListener("focus", syncFromServer);
    };
  }, [fetchSession]);

  // Listen for session status changes
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`session-${sessionId}`);

    channel.bind("session-status", (data: { status: string }) => {
      if (data.status === "ACTIVE") {
        fetchSession();
      } else if (data.status === "ENDED") {
        handleSubmitQuiz();
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`session-${sessionId}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Timer (PER_QUIZ only — PER_QUESTION handled separately below)
  useEffect(() => {
    if (status !== "active") return;
    if (sessionData?.quiz.timerType === "PER_QUESTION") return;

    if (!timerEndsAt) {
      if (timeLeft <= 0) return;

      const interval = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(interval);
            handleSubmitQuiz();
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }

    const syncCountdown = () => {
      const nextTimeLeft = getTimeLeftFromEndsAt(timerEndsAt, 0);
      setTimeLeft(nextTimeLeft);

      if (nextTimeLeft <= 0) {
        handleSubmitQuiz();
      }
    };

    syncCountdown();

    const interval = setInterval(() => {
      syncCountdown();
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, timerEndsAt]);

  // PER_QUESTION timer — pauses when student navigates away, resumes when they return
  useEffect(() => {
    if (status !== "active" || sessionData?.quiz.timerType !== "PER_QUESTION") return;
    const duration = sessionData.quiz.duration;
    if (!duration) return;

    const question = questions[currentIndex];
    if (!question) return;

    const qid = question.id;
    const storageKey = `qtimer:${participantId}:${qid}`;
    // Initialize remaining — prefer sessionStorage (survives refresh) then in-memory ref, then full duration
    if (questionTimerRemainingRef.current[qid] === undefined) {
      const stored = sessionStorage.getItem(storageKey);
      questionTimerRemainingRef.current[qid] = stored ? parseInt(stored, 10) : duration;
    }

    let remaining = questionTimerRemainingRef.current[qid];
    setPerQuestionTimeLeft(Math.max(0, remaining));

    const interval = setInterval(() => {
      remaining -= 1;
      questionTimerRemainingRef.current[qid] = remaining;
      sessionStorage.setItem(storageKey, String(remaining));
      setPerQuestionTimeLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(interval);
        // Lock this question — student cannot navigate back to it
        setLockedQuestionIds((prev) => {
          const next = new Set(prev);
          next.add(qid);
          if (participantId) {
            sessionStorage.setItem(`qtimerLocked:${participantId}`, JSON.stringify([...next]));
          }
          return next;
        });
        if (currentIndex < questions.length - 1) {
          const next = currentIndex + 1;
          setCurrentIndex(next);
          persistQuestionIndex(next);
        } else {
          handleSubmitQuiz();
        }
      }
    }, 1000);

    // Cleanup runs when currentIndex changes — stops the interval, remaining already saved
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, status]);

  // 1-minute time warning — fires once when timeLeft first drops to ≤ 60s
  useEffect(() => {
    if (status === "active" && timeLeft <= 60 && timeLeft > 0 && !timeWarningShownRef.current) {
      timeWarningShownRef.current = true;
      setShowTimeWarning(true);
      const t = setTimeout(() => setShowTimeWarning(false), 8000);
      return () => clearTimeout(t);
    }
  }, [timeLeft, status]);

  // ========================
  // ANTI-CHEAT ENGINE
  // ========================

  // Keep a ref in sync with sessionData so anti-cheat effects don't need
  // sessionData in their deps — without this, every fetchSession() call (triggered
  // by Pusher events) tears down and re-registers all event listeners, creating
  // a brief window where focus-loss events are silently dropped.
  useEffect(() => {
    antiCheatEnabledRef.current = Boolean(sessionData?.quiz.antiCheatEnabled);
  }, [sessionData?.quiz.antiCheatEnabled]);

  // Helper — fire-and-forget violation POST.  Uses participantId / sessionId
  // directly (both are stable URL params, not React state) so there is no
  // stale-closure risk regardless of when the callback is invoked.
  const postViolation = useCallback(
    (type: string) => {
      if (!participantId || !sessionId) return;
      fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, sessionId, type }),
      }).catch(() => {});
    },
    [participantId, sessionId]
  );

  // 1. Fullscreen enforcement — every exit immediately triggers a violation.
  // Deps: only [status, postViolation].  antiCheatEnabled is read from a ref at
  // call-time so this effect is NOT re-registered on every fetchSession().
  useEffect(() => {
    if (status !== "active") return;
    setIsFullscreenActive(Boolean(document.fullscreenElement));

    const handleFullscreenChange = () => {
      const fullscreenNowActive = Boolean(document.fullscreenElement);
      setIsFullscreenActive(fullscreenNowActive);

      if (fullscreenNowActive) {
        setSecureModeError(null);
        focusLostRef.current = false;
        setFocusLost(false);
        setWarningVisible(false);
        return;
      }

      if (!antiCheatEnabledRef.current) return;
      if (!isSubmittingRef.current) {
        setWarningVisible(true);
        setFocusLost(true);
        setWarningCount((c) => c + 1);
        postViolation("FULLSCREEN_EXIT");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [status, postViolation]);

  // 2. Tab switch / focus-loss shield — every focus-loss event reported immediately.
  // Registered once when status becomes "active"; antiCheatEnabled checked at call-time.
  useEffect(() => {
    if (status !== "active") return;

    const triggerFocusLoss = () => {
      if (!antiCheatEnabledRef.current) return;
      if (isSubmittingRef.current) return;
      if (!focusLostRef.current) {
        focusLostRef.current = true;
        setFocusLost(true);
        setWarningCount((c) => c + 1);
        postViolation("TAB_SWITCH");
      }
    };

    const restoreFocus = () => {
      focusLostRef.current = false;
      setFocusLost(false);
    };

    const handleVisibility = () => {
      if (document.hidden) triggerFocusLoss();
      else restoreFocus();
    };

    const handleBlur = () => { triggerFocusLoss(); };
    const handleFocus = () => { restoreFocus(); };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    // Polling fallback — catches mobile browsers that don't fire blur/visibilitychange reliably.
    const focusPoll = setInterval(() => {
      if (isSubmittingRef.current || document.hidden) return;
      if (!document.hasFocus()) triggerFocusLoss();
    }, 500);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      clearInterval(focusPoll);
    };
  }, [status, postViolation]);

  // 3. Copy-paste prevention
  useEffect(() => {
    if (status !== "active") return;

    const prevent = (e: ClipboardEvent) => {
      if (!antiCheatEnabledRef.current) return;
      e.preventDefault();
      postViolation("COPY_PASTE");
    };

    document.addEventListener("copy", prevent);
    document.addEventListener("paste", prevent);
    document.addEventListener("cut", prevent);
    return () => {
      document.removeEventListener("copy", prevent);
      document.removeEventListener("paste", prevent);
      document.removeEventListener("cut", prevent);
    };
  }, [status, postViolation]);

  // 4. Screenshot prevention — removed (browser APIs cannot block OS-level screenshots)

  // ── Biometrics simulation ──────────────────────────────────────────────

  // Mirror timeLeft into a ref so the vitals interval reads the latest value
  // without including timeLeft in the effect deps (avoids re-creating every second).
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // Fake heart-rate / SpO₂ — escalates as time pressure builds.
  useEffect(() => {
    if (status !== "active") return;
    const duration = sessionData?.quiz.duration ?? 600;

    const updateVitals = () => {
      const tl = timeLeftRef.current;
      const progress = Math.max(0, Math.min(1, 1 - tl / duration));
      const stressMul = tl < 60 ? 1.48 : tl < 120 ? 1.24 : 1.0;
      const baseHR = Math.round(72 + (118 - 72) * progress * stressMul);
      const noise = Math.round((Math.random() - 0.3) * 16);
      const newHR = Math.min(140, Math.max(64, baseHR + noise));
      heartRateRef.current = newHR;
      setHeartRate(newHR);
      const spo2Base = progress > 0.65 ? 95.2 : 97.8;
      const spo2Noise = (Math.random() - 0.5) * 3;
      setSpo2(Math.min(99, Math.max(91, Math.round(spo2Base + spo2Noise))));
    };

    updateVitals();
    const iv = setInterval(updateVitals, 2800);
    return () => clearInterval(iv);
  }, [status, sessionData?.quiz.duration]);

  // Persist lastQuestionIndex to server so student can resume if they close the browser
  const persistQuestionIndex = useCallback(
    async (index: number) => {
      if (!participantId) return;
      try {
        await fetch(`/api/participants/${participantId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastQuestionIndex: index }),
        });
      } catch {
        // non-critical
      }
    },
    [participantId]
  );

  // Handle answer selection
  async function handleAnswer(questionId: string, answerText: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: answerText }));

    await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, questionId, answerText }),
    });
  }

  async function persistCurrentAnswer(question: Question | undefined) {
    if (!question) return;
    const rawAnswer = answers[question.id];
    const answerText = question.type === "SHORT_ANSWER" ? rawAnswer?.trim() : rawAnswer;
    if (!answerText) return;
    await handleAnswer(question.id, answerText);
  }

  // Submit quiz
  async function handleSubmitQuiz() {
    if (isSubmittingRef.current || hasFinishedRef.current) return;
    isSubmittingRef.current = true;
    hasFinishedRef.current = true;

    // Clean up persisted timer data from sessionStorage
    if (participantId) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(`qtimer:${participantId}:`)) keysToRemove.push(key);
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      sessionStorage.removeItem(`timerEndsAt:${participantId}`);
      sessionStorage.removeItem(`qtimerLocked:${participantId}`);
    }

    try {
      const res = await fetch("/api/answers/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      });

      if (res.ok) {
        const data = await res.json();
        setScore(data.score);
      }
    } catch {
      // Ignore
    }

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    setStatus("finished");
  }

  async function enterSecureMode() {
    setSecureModeError(null);

    if (typeof document.documentElement.requestFullscreen !== "function") {
      setSecureModeError("This browser does not support fullscreen secure mode.");
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreenActive(Boolean(document.fullscreenElement));
      focusLostRef.current = false;
      setFocusLost(false);
      setWarningVisible(false);
    } catch {
      setIsFullscreenActive(Boolean(document.fullscreenElement));
      setSecureModeError("Secure mode was blocked. Tap again and allow fullscreen to continue the quiz.");
    }
  }

  function handleReenterFullscreen() {
    void enterSecureMode();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        Loading quiz...
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Quiz session not found
      </div>
    );
  }

  // WAITING state
  if (status === "waiting") {
    return (
      <div className="min-h-screen bg-surface px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl items-center justify-center">
          <div className="w-full overflow-hidden rounded-[32px] bg-primary p-6 text-white shadow-lg sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">Queued and ready</p>
                <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{sessionData.quiz.title}</h1>
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/88 backdrop-blur">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse" />
                  Waiting for your teacher to start the quiz
                </p>
                <div className="mt-5 flex flex-wrap gap-3 text-sm">
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Session code</div>
                    <div className="mt-1 font-mono text-2xl font-black tracking-[0.2em]">{sessionData.code}</div>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Question set</div>
                    <div className="mt-1 text-lg font-black">{sessionData.quiz.activeQuestionCount} questions</div>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Duration</div>
                    <div className="mt-1 text-lg font-black">{Math.max(1, Math.floor(sessionData.quiz.duration / 60))} min</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
                <div className="w-14 h-14 rounded-2xl bg-white/12 flex items-center justify-center mb-4">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <h2 className="text-lg font-black">Stay on this screen</h2>
                <p className="mt-2 text-sm leading-6 text-white/76">
                  Once the teacher starts, your mobile-friendly fullscreen quiz launches immediately with your assigned question set.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FINISHED state
  if (status === "finished") {
    return (
      <div className="min-h-screen bg-surface px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center justify-center">
          <div className="w-full rounded-[32px] border border-emerald-200/80 bg-white/92 p-6 text-center shadow-[0_28px_70px_rgba(16,185,129,0.14)] backdrop-blur sm:p-8">
          <div className="w-16 h-16 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-success/70">Completed</p>
          <h1 className="mt-2 text-3xl font-black text-foreground sm:text-4xl">Quiz Complete</h1>
          <p className="mt-2 text-sm text-muted sm:text-base">{sessionData.quiz.title}</p>
          {score !== null && (
            <div className="mb-6 mt-6 rounded-[28px] bg-surface border border-border p-8">
              <div className="text-5xl font-black text-primary mb-2">
                {score}/{sessionData.quiz.activeQuestionCount}
              </div>
              <div className="text-muted font-medium">
                {sessionData.quiz.activeQuestionCount > 0
                  ? Math.round((score / sessionData.quiz.activeQuestionCount) * 100)
                  : 0}% Accuracy
              </div>
            </div>
          )}
          {sessionData.quiz.antiCheatEnabled && warningCount > 0 && (
            <div className="mb-5 rounded-[20px] border border-danger/25 bg-danger/6 px-5 py-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-danger flex-shrink-0">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p className="text-sm font-bold text-danger">Anti-Cheat Report</p>
              </div>
              <p className="text-sm text-danger font-semibold">
                🚨 {warningCount} violation{warningCount > 1 ? "s" : ""} reported to your teacher
              </p>
            </div>
          )}
          <a
            href="/student"
            className="inline-flex items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-black text-white bg-primary shadow-sm transition hover:-translate-y-0.5"
          >
            Back to Dashboard
          </a>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE state — Quiz in progress
  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const allowSkip = sessionData.quiz.allowSkip !== false;
  const currentAnswer = answers[currentQuestion.id] || "";
  const answeredCount = questions.filter((question) => {
    const value = answers[question.id];
    return typeof value === "string" && value.trim().length > 0;
  }).length;
  const questionProgress = sessionData.quiz.activeQuestionCount > 0 ? ((currentIndex + 1) / sessionData.quiz.activeQuestionCount) * 100 : 0;
  const answerProgress = sessionData.quiz.activeQuestionCount > 0 ? (answeredCount / sessionData.quiz.activeQuestionCount) * 100 : 0;
  const canGoNext = currentIndex < questions.length - 1;
  // Prev is allowed only if not on first question, skip is enabled, and the previous question's timer hasn't expired
  const prevQuestion = questions[currentIndex - 1];
  const canGoPrev = currentIndex > 0 && allowSkip && !lockedQuestionIds.has(prevQuestion?.id ?? "");
  const questionTypeLabel = QUESTION_TYPE_LABELS[currentQuestion.type] || currentQuestion.type;
  const displayTimeLeft = sessionData.quiz.timerType === "PER_QUESTION" ? perQuestionTimeLeft : timeLeft;
  const isTimeLow = sessionData.quiz.timerType === "PER_QUESTION" ? perQuestionTimeLeft < 10 : timeLeft < 60;
  const secureModeRequired = Boolean(sessionData.quiz.antiCheatEnabled);
  const secureModeBlocked = secureModeRequired && (!isFullscreenActive || focusLost);
  const secureModeTitle = focusLost || warningCount > 0 ? "Secure Mode Interrupted" : "Enter Secure Mode";
  const secureModeMessage = focusLost || warningCount > 0
    ? "The quiz was covered because fullscreen or focus was lost. Your teacher has been notified. Return to secure mode to continue."
    : "This quiz is protected. Question content stays hidden until fullscreen is active on this device.";
  const isPerQuestion = sessionData.quiz.timerType === "PER_QUESTION";

  // Biometrics derived display values
  const hrColor = heartRate > 108 ? "#f87171" : heartRate > 88 ? "#facc15" : "#34d399";
  const spo2Color = spo2 < 95 ? "#f87171" : spo2 < 97 ? "#facc15" : "#60a5fa";
  const beatPeriod = `${(60 / heartRate).toFixed(2)}s`;

  return (
    <div
      className="min-h-screen bg-surface select-none"
      onCopy={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
    >
      {/* ── Secure-mode / Focus-loss overlay ── */}
      {secureModeBlocked && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/97 backdrop-blur-sm px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-danger/15 text-danger flex items-center justify-center mx-auto mb-5">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">{secureModeTitle}</h2>
          <p className="text-slate-400 text-sm mb-2 max-w-sm leading-6">
            {secureModeMessage}
          </p>
          {warningCount > 0 && (
            <p className="text-danger text-sm font-bold mb-3 px-4 py-2 rounded-xl bg-danger/15 border border-danger/30">
              ⚠️ {warningCount} violation{warningCount > 1 ? "s" : ""} recorded — your teacher can see this
            </p>
          )}
          {secureModeError && (
            <p className="mb-4 max-w-sm rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
              {secureModeError}
            </p>
          )}
          <button
            onClick={handleReenterFullscreen}
            className="px-8 py-3.5 rounded-2xl bg-primary text-white font-black text-sm shadow-lg hover:bg-primary/90 transition"
          >
            {isFullscreenActive ? "Return to Quiz" : "Enter Secure Mode"}
          </button>
        </div>
      )}

      {/* Warning Modal */}
      {sessionData.quiz.antiCheatEnabled && warningVisible && !secureModeBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 px-4 backdrop-blur-sm">
          <div className="mx-4 max-w-md rounded-[28px] bg-white p-7 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-danger mb-2">
              {warningCount <= 1 ? "You left the quiz window" : "Warning: Cheating Detected!"}
            </h2>
            <p className="text-muted mb-4">
              {warningCount <= 1
                ? "You left fullscreen mode or switched tabs. If this was accidental, please return to continue."
                : "You have multiple violations. Each one is being recorded and reported to your teacher."}
            </p>
            <p className="text-sm text-danger font-medium mb-6">
              Warnings: {warningCount}
            </p>
            <button
              onClick={handleReenterFullscreen}
              className="px-6 py-3 bg-primary text-white font-semibold rounded-2xl hover:bg-primary-dark transition"
            >
              Return to Fullscreen & Continue
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-3 pb-28 pt-3 sm:px-5 sm:pb-8 sm:pt-5 lg:px-8">
        <header className="sticky top-3 z-20 rounded-[24px] border border-white/80 bg-white/82 px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary leading-none">Live quiz</p>
              <h1 className="mt-0.5 truncate text-sm font-black text-foreground sm:text-base">{sessionData.quiz.title}</h1>
              <p className="mt-0.5 text-[11px] text-muted">
                Q {currentIndex + 1}/{sessionData.quiz.activeQuestionCount} · {answeredCount} answered
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="rounded-xl bg-slate-50 px-3 py-1.5 text-center">
                <div className="text-[9px] uppercase tracking-[0.15em] text-muted leading-none">Progress</div>
                <div className="mt-0.5 text-sm font-black text-foreground">{Math.round(questionProgress)}%</div>
              </div>
              <div className={`rounded-xl px-3 py-1.5 text-center ${isTimeLow ? "bg-danger/10 text-danger" : "bg-primary/8 text-primary"}`}>
                <div className="text-[9px] uppercase tracking-[0.15em] opacity-70 leading-none">Time</div>
                <div className={`mt-0.5 flex items-center gap-1 text-sm font-black ${isTimeLow ? "animate-pulse" : ""}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {formatTime(displayTimeLeft)}
                </div>
              </div>
              {sessionData.quiz.antiCheatEnabled && (
                <div className={`rounded-xl px-3 py-1.5 text-center ${warningCount > 0 ? "bg-danger/10 text-danger" : "bg-emerald-50 text-emerald-700"}`}>
                  <div className="text-[9px] uppercase tracking-[0.15em] opacity-70 leading-none">Monitor</div>
                  <div className="mt-0.5 text-sm font-black">{warningCount > 0 ? `⚠ ${warningCount}` : "Clean"}</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Live Biometrics Monitor ── */}
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-slate-950 border border-slate-700/60 px-3 py-2">
            {/* Heart Rate */}
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="heart-pulse text-base leading-none flex-shrink-0"
                style={{ color: hrColor, "--beat-period": beatPeriod } as React.CSSProperties}
                aria-hidden="true"
              >
                ♥
              </span>
              <div className="min-w-0">
                <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400 leading-none">Heart Rate</div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {/* Scrolling ECG trace */}
                  <div
                    className="w-16 h-5 overflow-hidden flex-shrink-0"
                    style={{ "--ecg-duration": beatPeriod } as React.CSSProperties}
                  >
                    <svg
                      width="128"
                      height="20"
                      viewBox="0 0 128 20"
                      className="ecg-scroll"
                      aria-hidden="true"
                    >
                      <polyline
                        points="0,10 8,10 10,8 12,10 16,10 18,12 20,1 22,19 24,10 30,10 33,7 36,10 64,10 72,10 74,8 76,10 80,10 82,12 84,1 86,19 88,10 94,10 97,7 100,10 128,10"
                        fill="none"
                        stroke={hrColor}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-black tabular-nums leading-none flex-shrink-0" style={{ color: hrColor }}>
                    {heartRate}
                    <span className="text-[8px] font-normal text-slate-400 ml-0.5">bpm</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="w-px h-7 bg-slate-700 flex-shrink-0" />

            {/* SpO₂ */}
            <div className="flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill={spo2Color} aria-hidden="true" className="flex-shrink-0">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
              <div>
                <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400 leading-none">SpO₂</div>
                <div className="mt-0.5 text-sm font-black tabular-nums leading-none" style={{ color: spo2Color }}>
                  {spo2}<span className="text-[8px] font-normal text-slate-400 ml-0.5">%</span>
                </div>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500 hidden sm:block">Live Monitor</span>
            </div>
          </div>

          <div className="mt-2 space-y-1.5">
            <div className="h-1.5 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${questionProgress}%` }}
              />
            </div>
            <div className="h-1.5 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-success transition-all duration-300"
                style={{ width: `${answerProgress}%` }}
              />
            </div>
          </div>
        </header>

        {/* 1-minute time warning banner */}
        {showTimeWarning && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-danger/10 border border-danger/25 px-4 py-3 text-danger text-sm font-semibold">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>Less than 1 minute remaining — finish up and submit!</span>
            <button onClick={() => setShowTimeWarning(false)} className="ml-auto opacity-60 hover:opacity-100" aria-label="Dismiss">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        {/* Persistent violation counter — visible throughout quiz once teacher is notified */}
        {sessionData.quiz.antiCheatEnabled && warningCount > 0 && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-danger/12 border border-danger/30 px-4 py-3 animate-pulse-once">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-danger flex-shrink-0">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p className="text-danger text-sm font-bold flex-1">
              ⚠️ {warningCount} violation{warningCount > 1 ? "s" : ""} recorded — your teacher can see this
            </p>
          </div>
        )}

        <main className={`mt-4 grid flex-1 gap-4 ${allowSkip ? "lg:grid-cols-[minmax(0,1fr)_280px]" : ""} lg:items-start`}>
          <section className="rounded-[30px] border border-white/80 bg-white/90 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                {questionTypeLabel}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-muted">
                Session {sessionData.code}
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-black leading-tight text-foreground sm:text-3xl">
              {currentQuestion.text}
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted">
              Tap your answer below. The layout is optimized for quick reading and comfortable mobile navigation.
            </p>

            {currentQuestion.type === "SHORT_ANSWER" ? (
              <div className="mt-6 rounded-[26px] border border-border/80 bg-surface p-4 sm:p-5">
                <label className="mb-2 block text-sm font-bold text-foreground">Your answer</label>
                <textarea
                  value={currentAnswer}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.id]: e.target.value,
                    }))
                  }
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      await persistCurrentAnswer(currentQuestion);
                      if (canGoNext) {
                        const newIdx = currentIndex + 1;
                        setCurrentIndex(newIdx);
                        persistQuestionIndex(newIdx);
                      } else {
                        handleSubmitQuiz();
                      }
                    }
                  }}
                  className="min-h-36 w-full rounded-2xl border border-border bg-white px-4 py-3 text-base text-foreground shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Type your answer here… (Ctrl+Enter to continue)"
                  autoComplete="off"
                />
              </div>
            ) : currentQuestion.type === "MATH" ? (
              <div className="mt-6 rounded-[26px] border border-violet-200/80 bg-violet-50/50 p-4 sm:p-5">
                <label className="mb-3 block text-sm font-bold text-foreground">Your answer</label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0 font-black text-lg">=</div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={currentAnswer}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [currentQuestion.id]: e.target.value,
                      }))
                    }
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        await persistCurrentAnswer(currentQuestion);
                        if (canGoNext) {
                          const newIdx = currentIndex + 1;
                          setCurrentIndex(newIdx);
                          persistQuestionIndex(newIdx);
                        } else {
                          handleSubmitQuiz();
                        }
                      }
                    }}
                    className="flex-1 rounded-2xl border border-violet-200 bg-white px-4 py-3 text-lg font-bold text-foreground shadow-inner focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                    placeholder="Type your answer…"
                    autoComplete="off"
                  />
                </div>
                <p className="mt-2.5 text-xs text-muted">Enter a number or expression (e.g. 42, 3.14, −2). Press Enter to continue.</p>
              </div>
            ) : (
              <div className="mt-6 grid gap-3">
                {currentQuestion.options.map((opt, optionIndex) => {
                  const isSelected = currentAnswer === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswer(currentQuestion.id, opt.id)}
                      className={`group w-full rounded-[24px] border px-4 py-4 text-left transition-all sm:px-5 sm:py-5 ${
                        isSelected
                          ? "border-primary bg-primary/8 shadow-sm"
                          : "border-border bg-white hover:border-primary/35 hover:bg-primary/5"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-black ${isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-600 group-hover:bg-primary/10 group-hover:text-primary"}`}>
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        <div className="flex-1">
                          <div className={`text-base font-semibold leading-6 ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {opt.text}
                          </div>
                          <div className="mt-1 text-xs text-muted">
                            {isSelected ? "Selected answer" : "Tap to choose this option"}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {allowSkip && <aside className="space-y-4 lg:sticky lg:top-32">
            <div className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Question rail</p>
                  <h3 className="mt-1 text-base font-black text-foreground">Jump around</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-muted">
                  {answeredCount}/{sessionData.quiz.activeQuestionCount}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-4">
                {questions.map((question, idx) => {
                  const isCurrent = idx === currentIndex;
                  const hasAnswer = Boolean(answers[question.id]?.trim());
                  const isLocked = lockedQuestionIds.has(question.id);
                  return (
                    <button
                      key={question.id}
                      onClick={async () => {
                        if (isLocked) return;
                        await persistCurrentAnswer(currentQuestion);
                        setCurrentIndex(idx);
                        persistQuestionIndex(idx);
                      }}
                      disabled={isLocked}
                      title={isLocked ? "Time expired — this question is locked" : undefined}
                      className={`h-11 rounded-2xl text-sm font-black transition ${
                        isCurrent
                          ? "bg-primary text-white shadow-sm"
                          : isLocked
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed line-through"
                          : hasAnswer
                          ? "bg-primary/10 text-primary"
                          : "bg-slate-100 text-muted"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-surface p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Focus status</p>
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <div className="rounded-2xl bg-white/85 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Current item</div>
                  <div className="mt-1 font-bold">Question {currentIndex + 1}</div>
                </div>
                <div className="rounded-2xl bg-white/85 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Saved answer</div>
                  <div className="mt-1 font-bold">{currentAnswer.trim() ? "Ready" : "Not yet answered"}</div>
                </div>
                {sessionData.quiz.antiCheatEnabled && (
                  <div className={`rounded-2xl px-4 py-3 ${warningCount > 0 ? "bg-danger/8 text-danger" : "bg-emerald-50 text-emerald-700"}`}>
                    <div className="text-[11px] uppercase tracking-[0.16em] opacity-70">Anti-cheat</div>
                    <div className="mt-1 font-bold">{warningCount > 0 ? `${warningCount} event${warningCount > 1 ? "s" : ""} logged` : "No violations"}</div>
                  </div>
                )}
              </div>
            </div>
          </aside>}
        </main>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-white/92 px-3 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:mt-4 sm:rounded-[28px] sm:border sm:p-4 sm:shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <button
              onClick={async () => {
                await persistCurrentAnswer(currentQuestion);
                const newIdx = Math.max(0, currentIndex - 1);
                setCurrentIndex(newIdx);
                persistQuestionIndex(newIdx);
              }}
              disabled={!canGoPrev}
              className="inline-flex min-w-[92px] items-center justify-center gap-1.5 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-bold text-foreground transition disabled:opacity-35"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Prev
            </button>

            <div className="min-w-0 flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-center text-xs font-semibold text-muted sm:text-sm">
              {currentAnswer.trim() ? "Answer captured" : "Select or type an answer before moving on"}
            </div>

            {canGoNext ? (
              <button
                onClick={async () => {
                  await persistCurrentAnswer(currentQuestion);
                  const newIdx = currentIndex + 1;
                  setCurrentIndex(newIdx);
                  persistQuestionIndex(newIdx);
                }}
                disabled={!allowSkip && !currentAnswer.trim()}
                className="inline-flex min-w-[110px] items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-black text-white bg-primary shadow-sm transition hover:-translate-y-0.5 disabled:opacity-35"
              >
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={async () => {
                  await persistCurrentAnswer(currentQuestion);
                  handleSubmitQuiz();
                }}
                className="inline-flex min-w-[124px] items-center justify-center gap-1.5 rounded-2xl bg-success px-4 py-3 text-sm font-black text-white shadow-[0_16px_32px_rgba(5,150,105,0.2)] transition hover:-translate-y-0.5"
              >
                Submit
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentQuizPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted">Loading...</div>}>
      <StudentQuizContent />
    </Suspense>
  );
}
