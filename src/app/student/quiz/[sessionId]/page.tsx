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
    questions: Question[];
  };
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ: "Multiple Choice",
  TRUE_FALSE: "True or False",
  SHORT_ANSWER: "Short Answer",
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
  const [timerEndsAt, setTimerEndsAt] = useState<string | null>(null);
  const [warningVisible, setWarningVisible] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const isSubmittingRef = useRef(false);
  const devToolsOpenRef = useRef(false);
  const hasFinishedRef = useRef(false);

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
        setQuestions(qs);
        setStatus("active");

        // Resume: use server-computed timeLeft (accounts for elapsed time since first open)
        const serverTimeLeft = data.resumeData?.timeLeft ?? data.quiz.duration;
        const nextTimerEndsAt = data.resumeData?.timerEndsAt ?? null;
        setTimerEndsAt(nextTimerEndsAt);
        setTimeLeft(getTimeLeftFromEndsAt(nextTimerEndsAt, serverTimeLeft));

        // Resume: jump back to where the student left off
        const resumeIndex = data.resumeData?.lastQuestionIndex ?? 0;
        setCurrentIndex(Math.min(resumeIndex, qs.length - 1));
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

  // Timer
  useEffect(() => {
    if (status !== "active") return;

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

  // ========================
  // ANTI-CHEAT ENGINE
  // ========================

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

  // 1. Fullscreen enforcement
  useEffect(() => {
    if (status !== "active" || !sessionData?.quiz.antiCheatEnabled) return;

    const enterFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Browser may block if not triggered by user gesture
      }
    };

    enterFullscreen();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && status === "active" && !isSubmittingRef.current) {
        setWarningVisible(true);
        setWarningCount((c) => c + 1);
        logViolation("FULLSCREEN_EXIT");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [status, logViolation, sessionData?.quiz.antiCheatEnabled]);

  // 2. Tab switch / visibility detection
  useEffect(() => {
    if (status !== "active" || !sessionData?.quiz.antiCheatEnabled) return;

    const handleVisibility = () => {
      if (document.hidden && !isSubmittingRef.current) {
        logViolation("TAB_SWITCH");
        setWarningVisible(true);
        setWarningCount((c) => c + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [status, logViolation, sessionData?.quiz.antiCheatEnabled]);

  // 3. Copy-paste prevention
  useEffect(() => {
    if (status !== "active" || !sessionData?.quiz.antiCheatEnabled) return;

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
  }, [status, logViolation, sessionData?.quiz.antiCheatEnabled]);

  // 4. Right-click prevention
  useEffect(() => {
    if (status !== "active" || !sessionData?.quiz.antiCheatEnabled) return;

    const prevent = (e: MouseEvent) => {
      e.preventDefault();
      logViolation("RIGHT_CLICK");
    };

    document.addEventListener("contextmenu", prevent);
    return () => document.removeEventListener("contextmenu", prevent);
  }, [status, logViolation, sessionData?.quiz.antiCheatEnabled]);

  // 5. DevTools detection
  useEffect(() => {
    if (status !== "active" || !sessionData?.quiz.antiCheatEnabled) return;

    const interval = setInterval(() => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      const isOpen = widthThreshold || heightThreshold;
      if (isOpen && !devToolsOpenRef.current) {
        devToolsOpenRef.current = true;
        logViolation("DEVTOOLS");
      } else if (!isOpen) {
        devToolsOpenRef.current = false;
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status, logViolation, sessionData?.quiz.antiCheatEnabled]);

  // 6. Screenshot prevention — removed (browser APIs cannot block OS-level screenshots)
  // SCREENSHOT_ATTEMPT violations from keyboard are still logged where possible.

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

  // Re-enter fullscreen from warning modal
  function handleReenterFullscreen() {
    setWarningVisible(false);
    document.documentElement.requestFullscreen().catch(() => {});
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
                {score}/{questions.length}
              </div>
              <div className="text-muted font-medium">
                {questions.length > 0
                  ? Math.round((score / questions.length) * 100)
                  : 0}
                % Accuracy
              </div>
            </div>
          )}
          {warningCount > 0 && (
            <p className="text-sm text-danger mb-4 flex items-center justify-center gap-1.5 rounded-2xl bg-danger/6 px-4 py-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              {warningCount} anti-cheat warning(s) recorded
            </p>
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

  const currentAnswer = answers[currentQuestion.id] || "";
  const answeredCount = questions.filter((question) => {
    const value = answers[question.id];
    return typeof value === "string" && value.trim().length > 0;
  }).length;
  const questionProgress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const answerProgress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  const canGoNext = currentIndex < questions.length - 1;
  const questionTypeLabel = QUESTION_TYPE_LABELS[currentQuestion.type] || currentQuestion.type;

  return (
    <div
      className="min-h-screen bg-surface select-none"
      onCopy={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
    >
      {/* Warning Modal */}
      {sessionData.quiz.antiCheatEnabled && warningVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 px-4 backdrop-blur-sm">
          <div className="mx-4 max-w-md rounded-[28px] bg-white p-7 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-danger mb-2">
              Warning: Cheating Detected!
            </h2>
            <p className="text-muted mb-4">
              You left fullscreen mode or switched tabs. This has been recorded and
              reported to your teacher.
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
        <header className="sticky top-3 z-20 rounded-[28px] border border-white/80 bg-white/82 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Live quiz</p>
              <h1 className="mt-1 truncate text-lg font-black text-foreground sm:text-2xl">{sessionData.quiz.title}</h1>
              <p className="mt-2 text-xs text-muted sm:text-sm">
                Question {currentIndex + 1} of {questions.length} • {answeredCount} answered
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted">Progress</div>
                <div className="mt-1 text-base font-black text-foreground">{Math.round(questionProgress)}%</div>
              </div>
              <div className={`rounded-2xl px-4 py-3 ${timeLeft < 60 ? "bg-danger/10 text-danger" : "bg-primary/8 text-primary"}`}>
                <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">Time left</div>
                <div className={`mt-1 flex items-center gap-2 text-base font-black ${timeLeft < 60 ? "animate-pulse" : ""}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {formatTime(timeLeft)}
                </div>
              </div>
              {sessionData.quiz.antiCheatEnabled && (
                <div className={`rounded-2xl px-4 py-3 ${warningCount > 0 ? "bg-danger/10 text-danger" : "bg-emerald-50 text-emerald-700"}`}>
                  <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">Monitor</div>
                  <div className="mt-1 text-base font-black">{warningCount > 0 ? `${warningCount} warning${warningCount > 1 ? "s" : ""}` : "Clean run"}</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${questionProgress}%` }}
              />
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-success transition-all duration-300"
                style={{ width: `${answerProgress}%` }}
              />
            </div>
          </div>
        </header>

        <main className="mt-4 grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
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
                  className="min-h-36 w-full rounded-2xl border border-border bg-white px-4 py-3 text-base text-foreground shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Type your answer here..."
                  autoComplete="off"
                />
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

          <aside className="space-y-4 lg:sticky lg:top-32">
            <div className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Question rail</p>
                  <h3 className="mt-1 text-base font-black text-foreground">Jump around</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-muted">
                  {answeredCount}/{questions.length}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-4">
                {questions.map((question, idx) => {
                  const isCurrent = idx === currentIndex;
                  const hasAnswer = Boolean(answers[question.id]?.trim());
                  return (
                    <button
                      key={question.id}
                      onClick={async () => {
                        await persistCurrentAnswer(currentQuestion);
                        setCurrentIndex(idx);
                        persistQuestionIndex(idx);
                      }}
                      className={`h-11 rounded-2xl text-sm font-black transition ${
                        isCurrent
                          ? "bg-primary text-white shadow-sm"
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
          </aside>
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
              disabled={currentIndex === 0}
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
                className="inline-flex min-w-[110px] items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-black text-white bg-primary shadow-sm transition hover:-translate-y-0.5"
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
