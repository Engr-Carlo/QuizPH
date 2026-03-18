"use client";

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
  quiz: {
    title: string;
    duration: number;
    timerType: string;
    randomizeQuestions: boolean;
    randomizeAnswers: boolean;
    questions: Question[];
  };
}

export default function StudentQuizPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const participantId = searchParams.get("participantId") || "";

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"waiting" | "active" | "finished">("waiting");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [warningVisible, setWarningVisible] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const isSubmittingRef = useRef(false);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (res.ok) {
      const data: SessionData = await res.json();
      setSessionData(data);

      if (data.status === "ACTIVE") {
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
        setTimeLeft(data.quiz.duration);
      } else if (data.status === "ENDED") {
        setStatus("finished");
      }
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
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
    if (status !== "active" || timeLeft <= 0) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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
    if (status !== "active") return;

    const enterFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Browser may block if not triggered by user gesture
      }
    };

    enterFullscreen();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && status === "active") {
        setWarningVisible(true);
        setWarningCount((c) => c + 1);
        logViolation("FULLSCREEN_EXIT");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [status, logViolation]);

  // 2. Tab switch / visibility detection
  useEffect(() => {
    if (status !== "active") return;

    const handleVisibility = () => {
      if (document.hidden) {
        logViolation("TAB_SWITCH");
        setWarningVisible(true);
        setWarningCount((c) => c + 1);
      }
    };

    const handleBlur = () => {
      logViolation("TAB_SWITCH");
      setWarningVisible(true);
      setWarningCount((c) => c + 1);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [status, logViolation]);

  // 3. Copy-paste prevention
  useEffect(() => {
    if (status !== "active") return;

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
  }, [status, logViolation]);

  // 4. Right-click prevention
  useEffect(() => {
    if (status !== "active") return;

    const prevent = (e: MouseEvent) => {
      e.preventDefault();
      logViolation("RIGHT_CLICK");
    };

    document.addEventListener("contextmenu", prevent);
    return () => document.removeEventListener("contextmenu", prevent);
  }, [status, logViolation]);

  // 5. DevTools detection
  useEffect(() => {
    if (status !== "active") return;

    const interval = setInterval(() => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        logViolation("DEVTOOLS");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status, logViolation]);

  // Handle answer selection
  async function handleAnswer(questionId: string, answerText: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: answerText }));

    await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, questionId, answerText }),
    });
  }

  // Submit quiz
  async function handleSubmitQuiz() {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">{sessionData.quiz.title}</h1>
          <p className="text-muted mb-4">
            Session Code:{" "}
            <span className="font-mono font-bold text-primary text-xl">
              {sessionData.code}
            </span>
          </p>
          <div className="animate-pulse text-lg text-primary font-medium flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Waiting for teacher to start the quiz...
          </div>
          <p className="text-sm text-muted mt-4">
            {sessionData.quiz.questions.length} questions •{" "}
            {Math.floor(sessionData.quiz.duration / 60)} min
          </p>
        </div>
      </div>
    );
  }

  // FINISHED state
  if (status === "finished") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">Quiz Complete!</h1>
          <p className="text-muted mb-6">{sessionData.quiz.title}</p>
          {score !== null && (
            <div className="bg-card border border-border rounded-2xl p-8 mb-6">
              <div className="text-5xl font-bold text-primary mb-2">
                {score}/{questions.length}
              </div>
              <div className="text-muted">
                {questions.length > 0
                  ? Math.round((score / questions.length) * 100)
                  : 0}
                % Accuracy
              </div>
            </div>
          )}
          {warningCount > 0 && (
            <p className="text-sm text-danger mb-4 flex items-center justify-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              {warningCount} anti-cheat warning(s) recorded
            </p>
          )}
          <a
            href="/student"
            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // ACTIVE state — Quiz in progress
  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  return (
    <div
      className="min-h-screen bg-background flex flex-col select-none"
      onCopy={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
    >
      {/* Warning Modal */}
      {warningVisible && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-8 max-w-md mx-4 text-center">
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
              className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition"
            >
              Return to Fullscreen & Continue
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="bg-card border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-bold">{sessionData.quiz.title}</h1>
          <span className="text-xs text-muted">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div
            className={`font-mono font-bold text-lg flex items-center gap-1.5 ${
              timeLeft < 60 ? "text-danger animate-pulse" : "text-primary"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {formatTime(timeLeft)}
          </div>
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-xs bg-danger/10 text-danger px-2 py-1 rounded-full">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              {warningCount}
            </span>
          )}
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-border">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Question */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="mb-2 text-xs font-medium text-primary uppercase">
            {currentQuestion.type === "MCQ"
              ? "Multiple Choice"
              : currentQuestion.type === "TRUE_FALSE"
              ? "True or False"
              : "Short Answer"}
          </div>

          <h2 className="text-2xl font-bold mb-8">{currentQuestion.text}</h2>

          {/* Options */}
          {currentQuestion.type === "SHORT_ANSWER" ? (
            <div>
              <input
                type="text"
                value={answers[currentQuestion.id] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.id]: e.target.value,
                  }))
                }
                className="w-full px-6 py-4 border-2 border-border rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="Type your answer..."
                autoComplete="off"
              />
            </div>
          ) : (
            <div className="grid gap-3">
              {currentQuestion.options.map((opt) => {
                const isSelected = answers[currentQuestion.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [currentQuestion.id]: opt.id,
                      }))
                    }
                    className={`w-full text-left px-6 py-4 rounded-xl border-2 transition text-lg ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-lg disabled:opacity-30 hover:bg-primary/5 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Previous
            </button>

            <div className="flex gap-1.5">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition ${
                    idx === currentIndex
                      ? "bg-primary text-white"
                      : answers[questions[idx].id]
                      ? "bg-primary/20 text-primary"
                      : "bg-border text-muted"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => {
                  // Submit current answer if exists
                  const currentQ = questions[currentIndex];
                  const ans = answers[currentQ.id];
                  if (ans && !isSubmittingRef.current) {
                    handleAnswer(currentQ.id, ans);
                  }
                  setCurrentIndex((i) => i + 1);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition"
              >
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={() => {
                  // Submit last answer
                  const currentQ = questions[currentIndex];
                  const ans = answers[currentQ.id];
                  if (ans) handleAnswer(currentQ.id, ans);
                  handleSubmitQuiz();
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-success text-white rounded-lg hover:opacity-90 transition"
              >
                Submit Quiz
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
