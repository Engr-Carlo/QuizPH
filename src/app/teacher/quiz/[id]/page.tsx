"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  type: string;
  topic: string;
  text: string;
  order: number;
  includedInQuiz: boolean;
  mathTolerance: number;
  options: Option[];
}

interface Session {
  id: string;
  code: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  archivedAt: string | null;
  _count: { participants: number };
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  timerType: string;
  duration: number;
  questionSelectionMode: "ALL" | "RANDOM" | "MANUAL";
  randomQuestionScope: "SESSION" | "PARTICIPANT";
  questionDrawCount: number | null;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  antiCheatEnabled: boolean;
  allowSkip: boolean;
  questions: Question[];
  sessions: Session[];
}

const Q_TYPE_LABELS: Record<string, string> = {
  MCQ: "Multiple Choice",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short Answer",
  MATH: "Math Problem",
};
const Q_TYPE_COLORS: Record<string, string> = {
  MCQ: "bg-primary/10 text-primary",
  TRUE_FALSE: "bg-secondary/10 text-secondary",
  SHORT_ANSWER: "bg-accent/10 text-accent",
  MATH: "bg-violet-500/10 text-violet-600",
};

const SESSION_STATUS_STYLE: Record<string, string> = {
  WAITING: "bg-warning/10 text-warning border border-warning/30",
  ACTIVE: "bg-success/10 text-success border border-success/30",
  ENDED: "bg-muted/10 text-muted border border-muted/20",
};

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Strip leading question numbering: "1." "1)" "1.)" "(1)" "Q1." etc.
function stripLeadingNumber(line: string): string {
  const stripped = line
    .replace(/^\s*(?:\(\d+\)|Q\.?\s*\d+\s*[\.\)\:\-]+|\d+\s*[\.\)\:\-]+\.?)\s*/, "")
    .trim();
  // Only use stripped if something actually changed and result is non-empty
  return stripped.length > 0 && stripped !== line.trim() ? stripped : line.trim();
}

function parseQuestionBlock(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  // Strip leading question number from the question text
  const text = stripLeadingNumber(lines[0]);
  let answerRef = "";

  const rawOptions = lines
    .slice(1)
    .map((line) => {
      // Accept "answer: C" as well as "2. answer: C" (numbered answer lines)
      const answerMatch = line.match(/^(?:\d+[\s\.\_\)\:]+)?(?:answer|correct answer)\s*:\s*(.+)$/i);
      if (answerMatch) {
        answerRef = answerMatch[1].trim();
        return null;
      }

      // Choice label patterns: "A." "A)" "A:" "A-" and also "(A)"
      const labelMatch =
        line.match(/^\(([A-Ha-h])\)\s*(.*)$/) ||
        line.match(/^([A-Ha-h])[\).:\-]\s*(.*)$/);
      const label = labelMatch?.[1]?.toUpperCase() || "";
      let optionText = labelMatch?.[2] ?? line.replace(/^[-*•]\s*/, "");

      const isMarkedCorrect = /^\*\s*/.test(optionText)
        || /\*\s*$/.test(optionText)
        || /\((correct|answer)\)\s*$/i.test(optionText)
        || /\[(correct|answer)\]\s*$/i.test(optionText);

      optionText = optionText
        .replace(/^\*\s*/, "")
        .replace(/\s*\*\s*$/, "")
        .replace(/\s*\((correct|answer)\)\s*$/i, "")
        .replace(/\s*\[(correct|answer)\]\s*$/i, "")
        .trim();

      if (!optionText) return null;

      return {
        label,
        text: optionText,
        isMarkedCorrect,
      };
    })
    .filter((option): option is { label: string; text: string; isMarkedCorrect: boolean } => Boolean(option));

  const normalizedAnswerRef = answerRef.toLowerCase().trim();
  const matchesAnswerRef = (option: { label: string; text: string }) => {
    if (!normalizedAnswerRef) return false;
    return option.label.toLowerCase() === normalizedAnswerRef
      || option.text.toLowerCase().trim() === normalizedAnswerRef;
  };

  if (rawOptions.length === 2 && rawOptions.every((option) => ["true", "false"].includes(option.text.toLowerCase()))) {
    const trueFalseOptions = rawOptions.map((option, index) => ({
      text: option.text,
      isCorrect: option.isMarkedCorrect || matchesAnswerRef(option) || (!normalizedAnswerRef && !rawOptions.some((item) => item.isMarkedCorrect) && index === 0),
    }));

    return {
      type: "TRUE_FALSE" as const,
      text,
      options: trueFalseOptions,
    };
  }

  if (rawOptions.length >= 2) {
    const hasMarkedAnswer = rawOptions.some((option) => option.isMarkedCorrect) || Boolean(normalizedAnswerRef);
    return {
      type: "MCQ" as const,
      text,
      options: rawOptions.map((option, index) => ({
        text: option.text,
        isCorrect: option.isMarkedCorrect || matchesAnswerRef(option) || (!hasMarkedAnswer && index === 0),
      })),
    };
  }

  return {
    type: "SHORT_ANSWER" as const,
    text,
    options: [{ text: rawOptions[0]?.text || answerRef || "", isCorrect: true }],
  };
}

function parseMultipleQuestionBlocks(input: string) {
  const rawBlocks = input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n[ \t]*\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  // Merge orphan "answer: X" blocks into the preceding question block.
  // An orphan block is one where every non-empty line is an answer line
  // (optionally prefixed with a number like "2. answer: C").
  const answerLineRe = /^(?:\d+[\s\.\)\:]+)?(?:answer|correct answer)\s*:/i;
  const merged: string[] = [];
  for (const block of rawBlocks) {
    const blockLines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const isOrphanAnswer =
      blockLines.length > 0 && blockLines.every((l) => answerLineRe.test(l));

    if (isOrphanAnswer && merged.length > 0) {
      // Normalise the answer line (strip leading number) and append to previous block
      const answerLines = blockLines.map((l) => {
        const m = l.match(/^(?:\d+[\s\.\)\:]+)?(?:answer|correct answer)\s*:\s*(.+)$/i);
        return m ? `answer: ${m[1].trim()}` : null;
      }).filter(Boolean);
      merged[merged.length - 1] += "\n" + answerLines.join("\n");
    } else {
      merged.push(block);
    }
  }

  return merged
    .map((block) => parseQuestionBlock(block))
    .filter((block): block is NonNullable<ReturnType<typeof parseQuestionBlock>> => Boolean(block));
}

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionFormTab, setQuestionFormTab] = useState<"single" | "paste">("single");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<"sessions" | "questions" | "settings">("sessions");
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ReturnType<typeof parseMultipleQuestionBlocks> | null>(null);
  const [topicFilter, setTopicFilter] = useState("ALL_TOPICS");
  const [regradedNotice, setRegradedNotice] = useState<string | null>(null);

  const [settingsTitle, setSettingsTitle] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsTimerType, setSettingsTimerType] = useState<"PER_QUIZ" | "PER_QUESTION">("PER_QUIZ");
  const [settingsDurationMinutes, setSettingsDurationMinutes] = useState(5);
  const [settingsDurationSeconds, setSettingsDurationSeconds] = useState(0);
  const [settingsSelectionMode, setSettingsSelectionMode] = useState<"ALL" | "RANDOM" | "MANUAL">("ALL");
  const [settingsRandomQuestionScope, setSettingsRandomQuestionScope] = useState<"SESSION" | "PARTICIPANT">("SESSION");
  const [settingsDrawCount, setSettingsDrawCount] = useState(10);
  const [settingsRandomizeQuestions, setSettingsRandomizeQuestions] = useState(false);
  const [settingsRandomizeAnswers, setSettingsRandomizeAnswers] = useState(false);
  const [settingsAntiCheatEnabled, setSettingsAntiCheatEnabled] = useState(false);
  const [settingsAllowSkip, setSettingsAllowSkip] = useState(true);

  const [qType, setQType] = useState<"MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "MATH">("MCQ");
  const [qTopic, setQTopic] = useState("General");
  const [qText, setQText] = useState("");
  const [qIncludedInQuiz, setQIncludedInQuiz] = useState(true);
  const [qMathTolerance, setQMathTolerance] = useState(0);
  const [bulkQuestionInput, setBulkQuestionInput] = useState("");
  const [qOptions, setQOptions] = useState<{ text: string; isCorrect: boolean }[]>([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  const fetchQuiz = useCallback(async () => {
    try {
      const res = await fetch(`/api/quiz/${quizId}`);
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setError(payload?.error || "Failed to load quiz");
        setQuiz(null);
        return;
      }

      const data = payload as Quiz;
      setQuiz(data);
      setError("");
      setSettingsTitle(data.title);
      setSettingsDescription(data.description || "");
      setSettingsTimerType(data.timerType as "PER_QUIZ" | "PER_QUESTION");
      setSettingsDurationMinutes(Math.floor(data.duration / 60));
      setSettingsDurationSeconds(data.duration % 60);
      setSettingsSelectionMode(data.questionSelectionMode);
      setSettingsRandomQuestionScope(data.randomQuestionScope);
      setSettingsDrawCount(data.questionDrawCount ?? Math.min(10, Math.max(1, data.questions.length || 1)));
      setSettingsRandomizeQuestions(data.randomizeQuestions);
      setSettingsRandomizeAnswers(data.randomizeAnswers);
      setSettingsAntiCheatEnabled(data.antiCheatEnabled);
      setSettingsAllowSkip(data.allowSkip ?? true);
    } catch {
      setError("Failed to load quiz");
      setQuiz(null);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  const topicOptions = quiz
    ? ["ALL_TOPICS", ...Array.from(new Set(quiz.questions.map((question) => question.topic))).sort()]
    : ["ALL_TOPICS"];

  const filteredQuestions = quiz
    ? quiz.questions.filter((question) => topicFilter === "ALL_TOPICS" || question.topic === topicFilter)
    : [];

  const visibleSessions = quiz ? quiz.sessions.filter((session) => !session.archivedAt) : [];
  const archivedSessions = quiz ? quiz.sessions.filter((session) => Boolean(session.archivedAt)) : [];

  const isDirty = quiz && (
    settingsTitle !== quiz.title ||
    settingsDescription !== (quiz.description || "") ||
    settingsTimerType !== quiz.timerType ||
    (settingsDurationMinutes * 60 + settingsDurationSeconds) !== quiz.duration ||
    settingsSelectionMode !== quiz.questionSelectionMode ||
    settingsRandomQuestionScope !== quiz.randomQuestionScope ||
    settingsDrawCount !== (quiz.questionDrawCount ?? 10) ||
    settingsRandomizeQuestions !== quiz.randomizeQuestions ||
    settingsRandomizeAnswers !== quiz.randomizeAnswers ||
    settingsAntiCheatEnabled !== quiz.antiCheatEnabled ||
    settingsAllowSkip !== (quiz.allowSkip ?? true)
  );

  const groupedQuestions = filteredQuestions.reduce<Record<string, Question[]>>((acc, question) => {
    const key = question.topic || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(question);
    return acc;
  }, {});

  function resetForm() {
    setQType("MCQ");
    setQTopic("General");
    setQText("");
    setQIncludedInQuiz(true);
    setQMathTolerance(0);
    setBulkQuestionInput("");
    setQOptions([
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ]);
    setShowQuestionForm(false);
    setEditingQuestion(null);
    setQuestionFormTab("single");
  }

  function handleTypeChange(type: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "MATH") {
    setQType(type);
    if (type === "TRUE_FALSE") {
      setQOptions([{ text: "True", isCorrect: true }, { text: "False", isCorrect: false }]);
    } else if (type === "SHORT_ANSWER" || type === "MATH") {
      setQOptions([{ text: "", isCorrect: true }]);
    } else {
      setQOptions([
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ]);
    }
  }

  async function handleSaveQuestion() {
    const url = editingQuestion
      ? `/api/quiz/${quizId}/questions/${editingQuestion.id}`
      : `/api/quiz/${quizId}/questions`;
    const res = await fetch(url, {
      method: editingQuestion ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: qType,
        topic: qTopic,
        text: qText,
        includedInQuiz: qIncludedInQuiz,
        mathTolerance: qType === "MATH" ? qMathTolerance : 0,
        options: qOptions.filter((o) => o.text.trim()),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      resetForm();
      fetchQuiz();
      if (editingQuestion && typeof data.regraded === "number" && data.regraded > 0) {
        const msg = `Answer key updated — ${data.regraded} existing answer${data.regraded > 1 ? "s" : ""} re-graded and scores adjusted.`;
        setRegradedNotice(msg);
        setTimeout(() => setRegradedNotice(null), 8000);
      }
    }
  }

  async function handleSaveSettings() {
    setSettingsLoading(true);
    const duration = (settingsDurationMinutes * 60) + settingsDurationSeconds;
    const res = await fetch(`/api/quiz/${quizId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: settingsTitle,
        description: settingsDescription || null,
        timerType: settingsTimerType,
        duration,
        questionSelectionMode: settingsSelectionMode,
        randomQuestionScope: settingsRandomQuestionScope,
        questionDrawCount: settingsSelectionMode === "RANDOM" ? settingsDrawCount : null,
        randomizeQuestions: settingsRandomizeQuestions,
        randomizeAnswers: settingsRandomizeAnswers,
        antiCheatEnabled: settingsAntiCheatEnabled,
        allowSkip: settingsAllowSkip,
      }),
    });
    setSettingsLoading(false);
    if (res.ok) fetchQuiz();
  }

  async function handleToggleIncluded(question: Question) {
    await fetch(`/api/quiz/${quizId}/questions/${question.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: question.type,
        topic: question.topic,
        text: question.text,
        order: question.order,
        includedInQuiz: !question.includedInQuiz,
        mathTolerance: question.mathTolerance ?? 0,
        options: question.options.map((option) => ({ text: option.text, isCorrect: option.isCorrect })),
      }),
    });
    fetchQuiz();
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm("Delete this question?")) return;
    await fetch(`/api/quiz/${quizId}/questions/${questionId}`, { method: "DELETE" });
    fetchQuiz();
  }

  function startEdit(question: Question) {
    setEditingQuestion(question);
    setQType(question.type as "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "MATH");
    setQTopic(question.topic || "General");
    setQText(question.text);
    setQIncludedInQuiz(question.includedInQuiz);
    setQMathTolerance(question.mathTolerance ?? 0);
    setQOptions(question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })));
    setShowQuestionForm(true);
  }

  function handleParseBulkQuestion() {
    const parsed = parseQuestionBlock(bulkQuestionInput);
    if (!parsed) return;
    setQType(parsed.type);
    setQText(parsed.text);
    setQOptions(parsed.options);
  }

  function handlePreviewBulkQuestions() {
    const parsedBlocks = parseMultipleQuestionBlocks(bulkQuestionInput);
    if (parsedBlocks.length === 0) return;
    setParsedPreview(parsedBlocks.map((b) => ({
      type: b.type,
      text: b.text,
      options: b.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
    })));
  }

  function togglePreviewCorrectAnswer(blockIndex: number, optionIndex: number) {
    setParsedPreview((prev) => {
      if (!prev) return null;
      return prev.map((block, bi) => {
        if (bi !== blockIndex) return block;
        return {
          ...block,
          options: block.options.map((opt, oi) => ({ ...opt, isCorrect: oi === optionIndex })),
        };
      });
    });
  }

  async function handleImportBulkQuestions() {
    if (!parsedPreview || parsedPreview.length === 0) return;
    setBulkImportLoading(true);

    for (const parsed of parsedPreview) {
      await fetch(`/api/quiz/${quizId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: parsed.type,
          topic: qTopic,
          text: parsed.text,
          includedInQuiz: qIncludedInQuiz,
          options: parsed.options,
        }),
      });
    }

    setBulkImportLoading(false);
    setBulkQuestionInput("");
    setParsedPreview(null);
    fetchQuiz();
  }

  async function handleCreateSession() {
    const res = await fetch(`/api/quiz/${quizId}/sessions`, { method: "POST" });
    if (res.ok) fetchQuiz();
  }

  async function handleSessionAction(sessionId: string, status: "ACTIVE" | "ENDED") {
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchQuiz();
  }

  async function handleArchiveSession(sessionId: string, archived: boolean) {
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
    fetchQuiz();
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm("Delete this ended session and all participant records? This cannot be undone.")) return;

    const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    if (res.ok) fetchQuiz();
  }

  async function handleDeleteQuiz() {
    if (!confirm("Are you sure you want to delete this quiz? This cannot be undone.")) return;
    const res = await fetch(`/api/quiz/${quizId}`, { method: "DELETE" });
    if (res.ok) router.push("/teacher");
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!quiz) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">{error || "Quiz not found"}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Re-grade success notice */}
      {regradedNotice && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 rounded-2xl bg-success border border-success/30 px-5 py-3 shadow-lg text-white text-sm font-semibold max-w-md w-[90vw]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>{regradedNotice}</span>
          <button onClick={() => setRegradedNotice(null)} className="ml-auto opacity-70 hover:opacity-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href="/teacher" className="hover:text-foreground transition">My Quizzes</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">{quiz.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground mb-2">{quiz.title}</h1>
          {quiz.description && <p className="text-muted text-sm mb-3">{quiz.description}</p>}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-surface border border-border text-muted">
              {quiz.timerType === "PER_QUIZ" ? "Per Quiz" : "Per Question"} / {formatDuration(quiz.duration)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-surface border border-border text-muted">
              {quiz.questionSelectionMode === "ALL"
                ? `All bank questions (${quiz.questions.length})`
                : quiz.questionSelectionMode === "RANDOM"
                ? `Random draw (${quiz.questionDrawCount ?? quiz.questions.length})`
                : `Manual selection (${quiz.questions.filter((question) => question.includedInQuiz).length})`}
            </span>
            {quiz.questionSelectionMode === "RANDOM" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-surface border border-border text-muted">
                {quiz.randomQuestionScope === "PARTICIPANT" ? "Per-student random set" : "Per-session random set"}
              </span>
            )}
            {quiz.randomizeQuestions && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-surface border border-border text-muted">
                Randomized questions
              </span>
            )}
            {quiz.randomizeAnswers && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-surface border border-border text-muted">
                Randomized answers
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${
              quiz.antiCheatEnabled
                ? "bg-warning/10 border-warning/30 text-warning"
                : "bg-surface border-border text-muted"
            }`}>
              {quiz.antiCheatEnabled ? "Anti-cheat premium enabled" : "Anti-cheat premium disabled"}
            </span>
          </div>
        </div>
        <button
          onClick={handleDeleteQuiz}
          className="text-xs font-medium text-danger hover:bg-danger/8 px-3 py-2 rounded-xl transition border border-danger/20"
        >
          Delete Quiz
        </button>
      </div>

      {/* -- Tab bar -- */}
      <div className="flex gap-1 border-b border-border mb-6">
        {([
          { key: "sessions", label: "Sessions", count: quiz.sessions.filter((s) => !s.archivedAt).length },
          { key: "questions", label: "Questions", count: quiz.questions.length },
          { key: "settings", label: "Settings", count: null },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveDetailTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition-all ${
              activeDetailTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {label}
            {count !== null && (
              <span className={`ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                activeDetailTab === key ? "bg-primary/10 text-primary" : "bg-surface text-muted"
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* -- Settings tab -- */}
      {activeDetailTab === "settings" && (
      <section className="mb-8">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base font-bold text-foreground">Quiz Settings</h2>
              <p className="text-xs text-muted mt-0.5">Adjust timer, question-bank behavior, randomization, and premium anti-cheat options.</p>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={settingsLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl bg-primary shadow-sm transition disabled:opacity-50 hover:bg-primary/90"
            >
              {isDirty && (
                <span className="w-2 h-2 rounded-full bg-warning flex-shrink-0" title="Unsaved changes" aria-label="Unsaved changes" />
              )}
              {settingsLoading ? "Saving..." : "Save Settings"}
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Quiz Title</label>
                <input
                  type="text"
                  value={settingsTitle}
                  onChange={(e) => setSettingsTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Description</label>
                <textarea
                  value={settingsDescription}
                  onChange={(e) => setSettingsDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Timer Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["PER_QUIZ", "PER_QUESTION"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSettingsTimerType(value)}
                      className={`px-4 py-2.5 text-sm font-medium rounded-xl border-2 text-left transition ${
                        settingsTimerType === value
                          ? "border-primary bg-primary/6 text-primary"
                          : "border-border text-muted hover:border-primary/40"
                      }`}
                    >
                      {value === "PER_QUIZ" ? "Per quiz" : "Per question"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Duration</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      value={settingsDurationMinutes}
                      onChange={(e) => setSettingsDurationMinutes(Math.max(0, Number(e.target.value) || 0))}
                      min={0}
                      max={120}
                      className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                    <p className="text-xs text-muted mt-1">Minutes</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={settingsDurationSeconds}
                      onChange={(e) => setSettingsDurationSeconds(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
                      min={0}
                      max={59}
                      className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                    <p className="text-xs text-muted mt-1">Seconds</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Question Bank Mode</label>
                <div className="grid gap-2">
                  {([
                    { value: "ALL", label: "Use all questions" },
                    { value: "RANDOM", label: "Draw random questions" },
                    { value: "MANUAL", label: "Use teacher-selected questions" },
                  ] as const).map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSettingsSelectionMode(item.value)}
                      className={`px-4 py-2.5 text-sm font-medium rounded-xl border-2 text-left transition ${
                        settingsSelectionMode === item.value
                          ? "border-primary bg-primary/6 text-primary"
                          : "border-border text-muted hover:border-primary/40"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {settingsSelectionMode === "RANDOM" && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Questions to draw</label>
                  <input
                    type="number"
                    value={settingsDrawCount}
                    onChange={(e) => setSettingsDrawCount(Math.max(1, Number(e.target.value) || 1))}
                    min={1}
                    max={Math.max(1, quiz.questions.length)}
                    className="w-full max-w-[220px] px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-foreground mb-2">Random draw scope</label>
                    <div className="grid md:grid-cols-2 gap-2">
                      {([
                        { value: "SESSION", label: "Same set per session", desc: "All students in a session share one random subset" },
                        { value: "PARTICIPANT", label: "Different set per student", desc: "Every student gets their own random subset" },
                      ] as const).map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setSettingsRandomQuestionScope(item.value)}
                          className={`px-4 py-2.5 text-sm font-medium rounded-xl border-2 text-left transition ${
                            settingsRandomQuestionScope === item.value
                              ? "border-primary bg-primary/6 text-primary"
                              : "border-border text-muted hover:border-primary/40"
                          }`}
                        >
                          <p className="font-semibold">{item.label}</p>
                          <p className="text-xs mt-1">{item.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 rounded-2xl border border-border p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={settingsRandomizeQuestions} onChange={(e) => setSettingsRandomizeQuestions(e.target.checked)} className="mt-1" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Randomize question order</p>
                    <p className="text-xs text-muted">Shuffle the delivered question order for students.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={settingsRandomizeAnswers} onChange={(e) => setSettingsRandomizeAnswers(e.target.checked)} className="mt-1" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Randomize answer choices</p>
                    <p className="text-xs text-muted">Shuffle MCQ and true/false option order.</p>
                  </div>
                </label>
              </div>

              <div className="space-y-3 rounded-2xl border border-border p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={!settingsAllowSkip} onChange={(e) => setSettingsAllowSkip(!e.target.checked)} className="mt-1" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Disable question skipping</p>
                    <p className="text-xs text-muted">Students must answer in order and cannot jump ahead or go back.</p>
                  </div>
                </label>
              </div>

              <div className="rounded-2xl border border-warning/25 bg-warning/6 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-foreground">Anti-cheat monitor</p>
                  <span className="inline-flex items-center rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-semibold text-warning">Premium trial</span>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={settingsAntiCheatEnabled} onChange={(e) => setSettingsAntiCheatEnabled(e.target.checked)} className="mt-1" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Enable premium anti-cheat</p>
                    <p className="text-xs text-muted mt-0.5">When enabled, the quiz runs with the following protections active:</p>
                    <ul className="mt-2 space-y-1.5 text-[11px] text-muted">
                      <li className="flex items-start gap-1.5"><span className="text-success mt-px">✓</span><span><strong className="text-foreground">Fullscreen enforcement</strong> — quiz launches in fullscreen; exiting is logged as a violation</span></li>
                      <li className="flex items-start gap-1.5"><span className="text-success mt-px">✓</span><span><strong className="text-foreground">Secure mode gate</strong> — students must tap <strong className="text-foreground">Enter Secure Mode</strong>; the quiz stays covered until fullscreen is truly active</span></li>
                      <li className="flex items-start gap-1.5"><span className="text-success mt-px">✓</span><span><strong className="text-foreground">Messenger Shield</strong> — when a chat bubble (Messenger, etc.) or any app steals focus, a full-screen blackout instantly hides quiz content and notifies you</span></li>
                      <li className="flex items-start gap-1.5"><span className="text-success mt-px">✓</span><span><strong className="text-foreground">Tab-switch detection</strong> — switching tabs or apps is logged and counts as a violation</span></li>
                      <li className="flex items-start gap-1.5"><span className="text-success mt-px">✓</span><span><strong className="text-foreground">Copy / paste blocked</strong> — clipboard is disabled for the duration of the quiz</span></li>
                      <li className="flex items-start gap-1.5"><span className="text-success mt-px">✓</span><span><strong className="text-foreground">Right-click disabled</strong> — context menu is suppressed</span></li>
                      <li className="flex items-start gap-1.5"><span className="text-success mt-px">✓</span><span>All violations are <strong className="text-foreground">reported live</strong> to this dashboard with timestamps</span></li>
                    </ul>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {activeDetailTab === "sessions" && (
      <>
      {/* ── Sessions ── */}
      <section className="mb-8">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-bold text-foreground">Sessions</h2>
            <button
              onClick={handleCreateSession}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-xl bg-secondary shadow-sm transition hover:bg-secondary/90"
            >
              + New Session
            </button>
          </div>

          {quiz.sessions.length === 0 ? (
            <div className="text-center py-10 text-muted text-sm">
              No sessions yet. Create one to start distributing this quiz.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {visibleSessions.map((s) => (
                <div key={s.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Join code */}
                    <button
                      onClick={() => copyCode(s.code)}
                      className="font-mono text-xl font-extrabold tracking-[0.25em] text-primary hover:text-primary-dark transition flex items-center gap-2"
                      title="Click to copy"
                    >
                      {s.code}
                      <span className="text-xs font-sans font-normal text-muted">
                        {copiedCode === s.code ? "Copied!" : "copy"}
                      </span>
                    </button>
                    {/* Status badge */}
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${SESSION_STATUS_STYLE[s.status] || ""}`}>
                      {s.status}
                    </span>
                    <span className="text-xs text-muted">
                      {s._count.participants} participant{s._count.participants !== 1 ? "s" : ""}
                    </span>
                    {(s.startedAt || s.endedAt) && (
                      <span className="text-[11px] text-muted hidden sm:inline">
                        {s.startedAt && <>Started {formatDate(s.startedAt)}</>}
                        {s.endedAt && <> · Ended {formatDate(s.endedAt)}</>}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {s.status === "WAITING" && (
                      <button
                        onClick={() => handleSessionAction(s.id, "ACTIVE")}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white rounded-xl transition hover:opacity-90"
                        style={{ background: "var(--success)" }}
                      >
                        Start Session
                      </button>
                    )}
                    {s.status === "ACTIVE" && (
                      <>
                        <Link
                          href={`/teacher/quiz/${quizId}/monitor/${s.id}`}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white rounded-xl bg-primary transition hover:bg-primary/90"
                        >
                          Monitor Live
                        </Link>
                        <button
                          onClick={() => handleSessionAction(s.id, "ENDED")}
                          className="px-3.5 py-1.5 text-xs font-semibold border border-danger/30 text-danger rounded-xl hover:bg-danger/8 transition"
                        >
                          End
                        </button>
                      </>
                    )}
                    {s.status === "ENDED" && (
                      <>
                        <Link
                          href={`/teacher/quiz/${quizId}/results/${s.id}`}
                          className="px-3.5 py-1.5 text-xs font-semibold border border-primary/30 text-primary rounded-xl hover:bg-primary/8 transition"
                        >
                          View Results
                        </Link>
                        <button
                          onClick={() => handleArchiveSession(s.id, true)}
                          className="px-3.5 py-1.5 text-xs font-semibold border border-warning/30 text-warning rounded-xl hover:bg-warning/8 transition"
                        >
                          Archive
                        </button>
                        <button
                          onClick={() => handleDeleteSession(s.id)}
                          className="px-3.5 py-1.5 text-xs font-semibold border border-danger/30 text-danger rounded-xl hover:bg-danger/8 transition"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {visibleSessions.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-muted">
                  No active or unarchived sessions. Archived sessions are shown below.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {archivedSessions.length > 0 && (
        <section className="mb-8">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground">Archived Sessions</h2>
                <p className="text-xs text-muted mt-0.5">Ended sessions that were archived instead of deleted.</p>
              </div>
              <span className="text-xs font-semibold text-muted">{archivedSessions.length} archived</span>
            </div>

            <div className="divide-y divide-border/50">
              {archivedSessions.map((s) => (
                <div key={s.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xl font-extrabold tracking-[0.25em] text-muted">{s.code}</span>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${SESSION_STATUS_STYLE[s.status] || ""}`}>
                      {s.status}
                    </span>
                    <span className="text-xs text-muted">
                      {s._count.participants} participant{s._count.participants !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/teacher/quiz/${quizId}/results/${s.id}`}
                      className="px-3.5 py-1.5 text-xs font-semibold border border-primary/30 text-primary rounded-xl hover:bg-primary/8 transition"
                    >
                      View Results
                    </Link>
                    <button
                      onClick={() => handleArchiveSession(s.id, false)}
                      className="px-3.5 py-1.5 text-xs font-semibold border border-secondary/30 text-secondary rounded-xl hover:bg-secondary/8 transition"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleDeleteSession(s.id)}
                      className="px-3.5 py-1.5 text-xs font-semibold border border-danger/30 text-danger rounded-xl hover:bg-danger/8 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      </>
      )}

      {/* ── Questions ── */}
      {activeDetailTab === "questions" && (
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Question Bank</h2>
            <p className="text-xs text-muted mt-0.5">
              {quiz.questions.length} stored question{quiz.questions.length !== 1 ? "s" : ""} across {new Set(quiz.questions.map((question) => question.topic)).size} topic{new Set(quiz.questions.map((question) => question.topic)).size !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-xl text-xs bg-white text-foreground"
            >
              {topicOptions.map((topic) => (
                <option key={topic} value={topic}>
                  {topic === "ALL_TOPICS" ? "All topics" : topic}
                </option>
              ))}
            </select>
            <button
              onClick={() => { resetForm(); setShowQuestionForm(true); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-xl bg-primary shadow-sm transition hover:bg-primary/90"
            >
              + Add Question
            </button>
          </div>
        </div>

        {/* ── Question form ── */}
        {showQuestionForm && (
          <div className="bg-card border-2 border-primary/25 rounded-2xl mb-5 shadow-sm fade-in overflow-hidden">

            {/* Tab header */}
            {!editingQuestion && (
              <div className="flex border-b border-border">
                {(["single", "paste"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => { setQuestionFormTab(tab); setParsedPreview(null); }}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                      questionFormTab === tab
                        ? "bg-primary/8 text-primary border-b-2 border-primary"
                        : "text-muted hover:text-foreground hover:bg-surface/60"
                    }`}
                  >
                    {tab === "single" ? "Single Question" : "Paste Multiple"}
                  </button>
                ))}
              </div>
            )}

            <div className="p-6">
              <h3 className="font-bold text-foreground mb-5">
                {editingQuestion ? "Edit Question" : questionFormTab === "single" ? "New Question" : "Import Questions"}
              </h3>

              {/* ─────────── PASTE MULTIPLE TAB ─────────── */}
              {!editingQuestion && questionFormTab === "paste" && (
                <div className="space-y-4">

                  {/* Format guide */}
                  <div className="rounded-xl border border-border/60 bg-surface/50 p-4">
                    <p className="text-xs font-bold text-foreground mb-2.5">Format guide</p>
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary mb-1.5">Multiple Choice</p>
                        <pre className="font-mono text-[11px] leading-5 text-muted whitespace-pre-wrap bg-white rounded-lg border border-border/50 px-3 py-2.5">{`What is the capital of the Philippines?
A. Manila
B. Cebu
C. Davao
D. Baguio
Answer: A`}</pre>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-success mb-1.5">True / False</p>
                          <pre className="font-mono text-[11px] leading-5 text-muted whitespace-pre-wrap bg-white rounded-lg border border-border/50 px-3 py-2.5">{`The sun is a star.
True
False
Answer: True`}</pre>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-warning mb-1.5">Short Answer / Math</p>
                          <pre className="font-mono text-[11px] leading-5 text-muted whitespace-pre-wrap bg-white rounded-lg border border-border/50 px-3 py-2.5">{`What is 12 × 12?
Answer: 144`}</pre>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted mt-3">
                      <strong>Tip:</strong> Separate each question with a <strong>blank line</strong>. Question numbers like <code className="bg-border/40 px-1 rounded text-[10px]">1.</code>, <code className="bg-border/40 px-1 rounded text-[10px]">1)</code>, <code className="bg-border/40 px-1 rounded text-[10px]">(1)</code> are automatically stripped.
                      Choice labels <code className="bg-border/40 px-1 rounded text-[10px]">A.</code> <code className="bg-border/40 px-1 rounded text-[10px]">A)</code> <code className="bg-border/40 px-1 rounded text-[10px]">(A)</code> are all accepted.
                    </p>
                  </div>

                  {/* Textarea */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Paste your questions here</label>
                    <textarea
                      value={bulkQuestionInput}
                      onChange={(e) => setBulkQuestionInput(e.target.value)}
                      rows={10}
                      className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y transition font-mono placeholder:text-muted placeholder:font-sans"
                      placeholder={`What is the capital of the Philippines?\nA. Manila\nB. Cebu\nC. Davao\nD. Baguio\nAnswer: A\n\nThe sun is a star.\nTrue\nFalse\nAnswer: True`}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-border text-muted text-sm rounded-xl hover:bg-surface transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handlePreviewBulkQuestions}
                      disabled={!bulkQuestionInput.trim()}
                      className="px-5 py-2 rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary/90 transition disabled:opacity-40"
                    >
                      Preview Import
                    </button>
                  </div>

                  {/* ── Bulk import preview ── */}
                  {parsedPreview !== null && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/4 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-foreground">
                          Preview — {parsedPreview.length} question{parsedPreview.length !== 1 ? "s" : ""} to import
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setParsedPreview(null)}
                            className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted hover:text-danger transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleImportBulkQuestions}
                            disabled={bulkImportLoading}
                            className="px-3 py-1.5 rounded-lg bg-primary text-xs font-semibold text-white hover:bg-primary-dark transition disabled:opacity-40"
                          >
                            {bulkImportLoading ? "Importing..." : "Confirm Import"}
                          </button>
                        </div>
                      </div>
                      {parsedPreview.map((block, bi) => (
                        <div key={bi} className="rounded-xl bg-white border border-border p-4">
                          <p className="text-[11px] font-semibold text-muted uppercase tracking-[0.16em] mb-1">
                            {Q_TYPE_LABELS[block.type]} · Q{bi + 1}
                          </p>
                          <p className="text-sm font-semibold text-foreground mb-3">{block.text}</p>
                          <div className="space-y-1.5">
                            {block.options.map((opt, oi) => (
                              <button
                                key={oi}
                                type="button"
                                onClick={() => togglePreviewCorrectAnswer(bi, oi)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm text-left transition ${
                                  opt.isCorrect
                                    ? "border-success/40 bg-success/8 text-success font-semibold"
                                    : "border-border bg-white text-foreground hover:border-primary/35"
                                }`}
                              >
                                <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                                  opt.isCorrect ? "border-success bg-success" : "border-muted"
                                }`} />
                                <span>{String.fromCharCode(65 + oi)}. {opt.text}</span>
                                {opt.isCorrect && <span className="ml-auto text-xs font-bold text-success">✓ Correct</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─────────── SINGLE QUESTION TAB ─────────── */}
              {(editingQuestion || questionFormTab === "single") && (
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-foreground mb-2">Question Type</label>
                <div className="flex flex-wrap gap-2">
                  {(["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "MATH"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTypeChange(t)}
                      className={`px-4 py-2 text-sm font-medium rounded-xl border-2 transition ${
                        qType === t
                          ? "border-primary bg-primary/8 text-primary"
                          : "border-border text-muted hover:border-primary/40"
                      }`}
                    >
                      {Q_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
                {qType === "MATH" && (
                  <p className="text-xs text-muted mt-2">Suitable for all levels — elementary arithmetic to college calculus. Students type their answer; numeric values are compared with tolerance (e.g. &ldquo;3.0&rdquo; and &ldquo;3&rdquo; are both accepted).</p>
                )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Topic</label>
                  <input
                    type="text"
                    value={qTopic}
                    onChange={(e) => setQTopic(e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    placeholder="e.g., Algebra, Grammar, Chapter 2"
                  />
                </div>
                <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 bg-surface/40 mt-7 md:mt-0">
                  <input
                    type="checkbox"
                    checked={qIncludedInQuiz}
                    onChange={(e) => setQIncludedInQuiz(e.target.checked)}
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Include in quiz draw</p>
                    <p className="text-xs text-muted">Used by random/manual bank selection modes.</p>
                  </div>
                </label>
              </div>

              {/* Question text */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Question Text</label>
                <textarea
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition placeholder:text-muted"
                  placeholder="Enter your question..."
                />
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  {qType === "SHORT_ANSWER" ? "Correct Answer" : qType === "MATH" ? "Correct Answer (number or expression)" : "Answer Choices"}
                </label>
                <div className="space-y-2">
                  {qOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {/* Correct radio / indicator */}
                      <button
                        type="button"
                        onClick={() => {
                          if (qType === "SHORT_ANSWER" || qType === "MATH") return;
                          setQOptions(qOptions.map((o, i) => ({ ...o, isCorrect: i === idx })));
                        }}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                          opt.isCorrect
                            ? "border-success bg-success"
                            : "border-border hover:border-success/50"
                        }`}
                        disabled={qType === "SHORT_ANSWER" || qType === "MATH"}
                        title="Mark as correct"
                      >
                        {opt.isCorrect && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>

                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) =>
                          setQOptions(qOptions.map((o, i) => i === idx ? { ...o, text: e.target.value } : o))
                        }
                        className={`flex-1 px-3 py-2 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted ${
                          opt.isCorrect ? "border-success/40 bg-success/5" : "border-border"
                        }`}
                        placeholder={
                          qType === "SHORT_ANSWER"
                            ? "Expected correct answer"
                            : qType === "MATH"
                            ? "e.g. 42, 3.14, 2/3, x=5"
                            : `Option ${String.fromCharCode(65 + idx)}`
                        }
                        disabled={qType === "TRUE_FALSE"}
                      />

                      {qType === "MCQ" && qOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setQOptions(qOptions.filter((_, i) => i !== idx))}
                          className="text-muted hover:text-danger w-7 h-7 rounded-lg hover:bg-danger/8 flex items-center justify-center text-sm transition"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {qType === "MCQ" && qOptions.length < 6 && (
                  <button
                    type="button"
                    onClick={() => setQOptions([...qOptions, { text: "", isCorrect: false }])}
                    className="text-xs font-semibold text-primary mt-3 hover:underline"
                  >
                    + Add another option
                  </button>
                )}
              </div>

              {/* MATH tolerance setting */}
              {qType === "MATH" && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Acceptable Tolerance (±)
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-violet-600">±</span>
                    <input
                      type="number"
                      value={qMathTolerance}
                      onChange={(e) => setQMathTolerance(Math.max(0, parseFloat(e.target.value) || 0))}
                      min={0}
                      step={0.01}
                      className="w-36 px-4 py-2 border border-violet-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition"
                      placeholder="0"
                    />
                    <span className="text-xs text-muted">Set to 0 for exact match</span>
                  </div>
                  <p className="text-xs text-muted mt-1.5">
                    Example: correct answer is <strong>3.14</strong> with tolerance <strong>0.05</strong> → answers from <strong>3.09</strong> to <strong>3.19</strong> are accepted.
                  </p>
                </div>
              )}

              {/* Form actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveQuestion}
                  disabled={!qText.trim()}
                  className="px-5 py-2 text-white text-sm font-semibold rounded-xl bg-primary transition disabled:opacity-40 hover:bg-primary/90"
                >
                  {editingQuestion ? "Update Question" : "Add Question"}
                </button>
                <button
                  onClick={resetForm}
                  className="px-5 py-2 border border-border text-muted text-sm rounded-xl hover:bg-surface transition"
                >
                  Cancel
                </button>
              </div>
              </div>
              )}

            </div>
          </div>
        )}

        {/* Question list */}
        {quiz.questions.length === 0 && !showQuestionForm ? (
          <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl">
            <p className="text-muted text-sm">No questions yet. Add your first one above.</p>
          </div>
        ) : filteredQuestions.length === 0 && !showQuestionForm ? (
          <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl">
            <p className="text-muted text-sm">No questions found for the selected topic filter.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedQuestions).map(([topic, questions]) => (
              <div key={topic} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">{topic}</h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface border border-border text-muted">
                      {questions.length} item{questions.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {questions.map((q, idx) => (
                  <div key={q.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-primary/20 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs font-bold text-muted/60">Q{quiz.questions.findIndex((question) => question.id === q.id) + 1}</span>
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${Q_TYPE_COLORS[q.type] || "bg-muted/10 text-muted"}`}>
                            {Q_TYPE_LABELS[q.type] || q.type}
                          </span>
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${q.includedInQuiz ? "bg-success/10 text-success border border-success/30" : "bg-muted/10 text-muted border border-border"}`}>
                            {q.includedInQuiz ? "Included" : "Excluded"}
                          </span>
                        </div>
                        <p className="font-semibold text-foreground text-sm mb-2">{q.text}</p>
                        <div className="flex flex-wrap gap-2">
                          {q.options.map((opt) => (
                            <span
                              key={opt.id}
                              className={`text-xs px-2.5 py-1 rounded-full border ${
                                opt.isCorrect
                                  ? "bg-success/10 border-success/30 text-success font-semibold"
                                  : "bg-surface border-border text-muted"
                              }`}
                            >
                              {opt.isCorrect && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1 -mt-0.5" aria-hidden="true">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                              {opt.text}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleToggleIncluded(q)}
                          className="text-xs font-medium text-secondary hover:bg-secondary/8 px-3 py-1.5 rounded-lg transition"
                        >
                          {q.includedInQuiz ? "Exclude" : "Include"}
                        </button>
                        <button
                          onClick={() => startEdit(q)}
                          className="text-xs font-medium text-primary hover:bg-primary/8 px-3 py-1.5 rounded-lg transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="text-xs font-medium text-danger hover:bg-danger/8 px-3 py-1.5 rounded-lg transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
      )}
    </DashboardLayout>
  );
}
