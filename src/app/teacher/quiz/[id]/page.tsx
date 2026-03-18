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
  text: string;
  order: number;
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
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
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

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [qType, setQType] = useState<"MCQ" | "TRUE_FALSE" | "SHORT_ANSWER">("MCQ");
  const [qText, setQText] = useState("");
  const [qOptions, setQOptions] = useState<{ text: string; isCorrect: boolean }[]>([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  const fetchQuiz = useCallback(async () => {
    const res = await fetch(`/api/quiz/${quizId}`);
    if (res.ok) setQuiz(await res.json());
    setLoading(false);
  }, [quizId]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  function resetForm() {
    setQType("MCQ");
    setQText("");
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
      body: JSON.stringify({ type: qType, text: qText, options: qOptions.filter((o) => o.text.trim()) }),
    });
    if (res.ok) { resetForm(); fetchQuiz(); }
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm("Delete this question?")) return;
    await fetch(`/api/quiz/${quizId}/questions/${questionId}`, { method: "DELETE" });
    fetchQuiz();
  }

  function startEdit(question: Question) {
    setEditingQuestion(question);
    setQType(question.type as "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER");
    setQText(question.text);
    setQOptions(question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })));
    setShowQuestionForm(true);
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
              {quiz.timerType === "PER_QUIZ" ? "Per Quiz" : "Per Question"} · {formatDuration(quiz.duration)}
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
          </div>
        </div>
        <button
          onClick={handleDeleteQuiz}
          className="text-xs font-medium text-danger hover:bg-danger/8 px-3 py-2 rounded-xl transition border border-danger/20"
        >
          Delete Quiz
        </button>
      </div>

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
            <h2 className="text-base font-bold text-foreground">Questions</h2>
            <p className="text-xs text-muted mt-0.5">{quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""} added</p>
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
