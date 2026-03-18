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
  options: Option[];
}

interface Session {
  id: string;
  code: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  _count: { participants: number };
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  timerType: string;
  duration: number;
  questionSelectionMode: "ALL" | "RANDOM" | "MANUAL";
  questionDrawCount: number | null;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  antiCheatEnabled: boolean;
  questions: Question[];
  sessions: Session[];
}

const Q_TYPE_LABELS: Record<string, string> = {
  MCQ: "Multiple Choice",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short Answer",
};
const Q_TYPE_COLORS: Record<string, string> = {
  MCQ: "bg-primary/10 text-primary",
  TRUE_FALSE: "bg-secondary/10 text-secondary",
  SHORT_ANSWER: "bg-accent/10 text-accent",
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

function parseQuestionBlock(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  const text = lines[0];
  const rawOptions = lines.slice(1).map((line) =>
    line.replace(/^[A-Ha-h][\).:-]\s*/, "").replace(/^[-*]\s*/, "").trim()
  ).filter(Boolean);

  if (rawOptions.length === 2 && rawOptions.every((option) => ["true", "false"].includes(option.toLowerCase()))) {
    return {
      type: "TRUE_FALSE" as const,
      text,
      options: [
        { text: rawOptions[0], isCorrect: true },
        { text: rawOptions[1], isCorrect: false },
      ],
    };
  }

  if (rawOptions.length >= 2) {
    return {
      type: "MCQ" as const,
      text,
      options: rawOptions.map((option, index) => ({
        text: option,
        isCorrect: index === 0,
      })),
    };
  }

  return {
    type: "SHORT_ANSWER" as const,
    text,
    options: [{ text: rawOptions[0] || "", isCorrect: true }],
  };
}

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [settingsTitle, setSettingsTitle] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsTimerType, setSettingsTimerType] = useState<"PER_QUIZ" | "PER_QUESTION">("PER_QUIZ");
  const [settingsDurationMinutes, setSettingsDurationMinutes] = useState(5);
  const [settingsDurationSeconds, setSettingsDurationSeconds] = useState(0);
  const [settingsSelectionMode, setSettingsSelectionMode] = useState<"ALL" | "RANDOM" | "MANUAL">("ALL");
  const [settingsDrawCount, setSettingsDrawCount] = useState(10);
  const [settingsRandomizeQuestions, setSettingsRandomizeQuestions] = useState(false);
  const [settingsRandomizeAnswers, setSettingsRandomizeAnswers] = useState(false);
  const [settingsAntiCheatEnabled, setSettingsAntiCheatEnabled] = useState(false);

  const [qType, setQType] = useState<"MCQ" | "TRUE_FALSE" | "SHORT_ANSWER">("MCQ");
  const [qTopic, setQTopic] = useState("General");
  const [qText, setQText] = useState("");
  const [qIncludedInQuiz, setQIncludedInQuiz] = useState(true);
  const [bulkQuestionInput, setBulkQuestionInput] = useState("");
  const [qOptions, setQOptions] = useState<{ text: string; isCorrect: boolean }[]>([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  const fetchQuiz = useCallback(async () => {
    const res = await fetch(`/api/quiz/${quizId}`);
    if (res.ok) {
      const data: Quiz = await res.json();
      setQuiz(data);
      setSettingsTitle(data.title);
      setSettingsDescription(data.description || "");
      setSettingsTimerType(data.timerType as "PER_QUIZ" | "PER_QUESTION");
      setSettingsDurationMinutes(Math.floor(data.duration / 60));
      setSettingsDurationSeconds(data.duration % 60);
      setSettingsSelectionMode(data.questionSelectionMode);
      setSettingsDrawCount(data.questionDrawCount ?? Math.min(10, Math.max(1, data.questions.length || 1)));
      setSettingsRandomizeQuestions(data.randomizeQuestions);
      setSettingsRandomizeAnswers(data.randomizeAnswers);
      setSettingsAntiCheatEnabled(data.antiCheatEnabled);
    }
    setLoading(false);
  }, [quizId]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  function resetForm() {
    setQType("MCQ");
    setQTopic("General");
    setQText("");
    setQIncludedInQuiz(true);
    setBulkQuestionInput("");
    setQOptions([
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ]);
    setShowQuestionForm(false);
    setEditingQuestion(null);
  }

  function handleTypeChange(type: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER") {
    setQType(type);
    if (type === "TRUE_FALSE") {
      setQOptions([{ text: "True", isCorrect: true }, { text: "False", isCorrect: false }]);
    } else if (type === "SHORT_ANSWER") {
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
        options: qOptions.filter((o) => o.text.trim()),
      }),
    });
    if (res.ok) { resetForm(); fetchQuiz(); }
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
        questionDrawCount: settingsSelectionMode === "RANDOM" ? settingsDrawCount : null,
        randomizeQuestions: settingsRandomizeQuestions,
        randomizeAnswers: settingsRandomizeAnswers,
        antiCheatEnabled: settingsAntiCheatEnabled,
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
    setQType(question.type as "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER");
    setQTopic(question.topic || "General");
    setQText(question.text);
    setQIncludedInQuiz(question.includedInQuiz);
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
        <div className="text-center py-12">Quiz not found</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
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
              className="px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition disabled:opacity-50 hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
            >
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

              <div className="rounded-2xl border border-warning/25 bg-warning/6 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-foreground">Anti-cheat monitor</p>
                  <span className="inline-flex items-center rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-semibold text-warning">Premium trial</span>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={settingsAntiCheatEnabled} onChange={(e) => setSettingsAntiCheatEnabled(e.target.checked)} className="mt-1" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Enable premium anti-cheat</p>
                    <p className="text-xs text-muted">Use this as a limited-time premium feature teaser with fullscreen and activity monitoring.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ Sessions â”€â”€ */}
      <section className="mb-8">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-bold text-foreground">Sessions</h2>
            <button
              onClick={handleCreateSession}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-sm transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--secondary), #00a8a5)" }}
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
              {quiz.sessions.map((s) => (
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
                          className="px-3.5 py-1.5 text-xs font-semibold text-white rounded-xl transition hover:opacity-90"
                          style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
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
                      <Link
                        href={`/teacher/quiz/${quizId}/results/${s.id}`}
                        className="px-3.5 py-1.5 text-xs font-semibold border border-primary/30 text-primary rounded-xl hover:bg-primary/8 transition"
                      >
                        View Results
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* â”€â”€ Questions â”€â”€ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Question Bank</h2>
            <p className="text-xs text-muted mt-0.5">
              {quiz.questions.length} stored question{quiz.questions.length !== 1 ? "s" : ""} across {new Set(quiz.questions.map((question) => question.topic)).size} topic{new Set(quiz.questions.map((question) => question.topic)).size !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowQuestionForm(true); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-sm transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
          >
            + Add Question
          </button>
        </div>

        {/* â”€â”€ Question form â”€â”€ */}
        {showQuestionForm && (
          <div className="bg-card border-2 border-primary/25 rounded-2xl p-6 mb-5 shadow-sm fade-in">
            <h3 className="font-bold text-foreground mb-5">
              {editingQuestion ? "Edit Question" : "New Question"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Paste Question Block</label>
                <textarea
                  value={bulkQuestionInput}
                  onChange={(e) => setBulkQuestionInput(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition placeholder:text-muted"
                  placeholder={`Paste a full question like:\nWhat is the capital of the Philippines?\nA. Manila\nB. Cebu\nC. Davao\nD. Baguio`}
                />
                <div className="flex items-center justify-between gap-3 mt-2">
                  <p className="text-xs text-muted">The system will split the question and options automatically. You can still choose the correct answer manually.</p>
                  <button
                    type="button"
                    onClick={handleParseBulkQuestion}
                    disabled={!bulkQuestionInput.trim()}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-primary hover:bg-primary/8 transition disabled:opacity-40"
                  >
                    Parse Paste
                  </button>
                </div>
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Question Type</label>
                <div className="flex gap-2">
                  {(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"] as const).map((t) => (
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
              </div>

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
                  {qType === "SHORT_ANSWER" ? "Correct Answer" : "Answer Choices"}
                </label>
                <div className="space-y-2">
                  {qOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {/* Correct radio / indicator */}
                      <button
                        type="button"
                        onClick={() => {
                          if (qType === "SHORT_ANSWER") return;
                          setQOptions(qOptions.map((o, i) => ({ ...o, isCorrect: i === idx })));
                        }}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                          opt.isCorrect
                            ? "border-success bg-success"
                            : "border-border hover:border-success/50"
                        }`}
                        disabled={qType === "SHORT_ANSWER"}
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

              {/* Form actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveQuestion}
                  disabled={!qText.trim()}
                  className="px-5 py-2 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40 hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
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
          </div>
        )}

        {/* Question list */}
        {quiz.questions.length === 0 && !showQuestionForm ? (
          <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl">
            <p className="text-muted text-sm">No questions yet. Add your first one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quiz.questions.map((q, idx) => (
              <div key={q.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-primary/20 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Type + number */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-muted/60">Q{idx + 1}</span>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${Q_TYPE_COLORS[q.type] || "bg-muted/10 text-muted"}`}>
                        {Q_TYPE_LABELS[q.type] || q.type}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-surface border border-border text-muted">
                        {q.topic}
                      </span>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${q.includedInQuiz ? "bg-success/10 text-success border border-success/30" : "bg-muted/10 text-muted border border-border"}`}>
                        {q.includedInQuiz ? "Included" : "Excluded"}
                      </span>
                    </div>
                    {/* Question text */}
                    <p className="font-semibold text-foreground text-sm mb-2">{q.text}</p>
                    {/* Options preview */}
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
        )}
      </section>
    </DashboardLayout>
  );
}
