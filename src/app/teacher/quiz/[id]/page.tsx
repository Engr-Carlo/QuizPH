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

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Question form state
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
    if (res.ok) {
      setQuiz(await res.json());
    }
    setLoading(false);
  }, [quizId]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

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
      setQOptions([
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ]);
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
        text: qText,
        options: qOptions.filter((o) => o.text.trim()),
      }),
    });

    if (res.ok) {
      resetForm();
      fetchQuiz();
    }
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
    setQOptions(
      question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect }))
    );
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
    if (!confirm("Are you sure you want to delete this quiz? This cannot be undone."))
      return;
    const res = await fetch(`/api/quiz/${quizId}`, { method: "DELETE" });
    if (res.ok) router.push("/teacher");
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted">Loading...</div>
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
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-muted text-sm mt-1">{quiz.description}</p>
          )}
          <div className="flex gap-4 mt-2 text-xs text-muted">
            <span>⏱️ {quiz.timerType === "PER_QUIZ" ? "Per Quiz" : "Per Question"}: {Math.floor(quiz.duration / 60)}m {quiz.duration % 60}s</span>
            {quiz.randomizeQuestions && <span>🔀 Random questions</span>}
            {quiz.randomizeAnswers && <span>🔀 Random answers</span>}
          </div>
        </div>
        <button
          onClick={handleDeleteQuiz}
          className="text-sm text-danger hover:bg-danger/10 px-3 py-1.5 rounded-lg transition"
        >
          Delete Quiz
        </button>
      </div>

      {/* Sessions */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Quiz Sessions</h2>
          <button
            onClick={handleCreateSession}
            className="px-4 py-2 bg-secondary text-white text-sm font-medium rounded-lg hover:opacity-90 transition"
          >
            + New Session
          </button>
        </div>

        {quiz.sessions.length === 0 ? (
          <p className="text-muted text-sm">No sessions yet. Create one to start.</p>
        ) : (
          <div className="space-y-3">
            {quiz.sessions.map((s) => (
              <div
                key={s.id}
                className="bg-card border border-border rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-lg font-bold tracking-widest text-primary">
                    {s.code}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      s.status === "WAITING"
                        ? "bg-warning/20 text-warning"
                        : s.status === "ACTIVE"
                        ? "bg-success/20 text-success"
                        : "bg-muted/20 text-muted"
                    }`}
                  >
                    {s.status}
                  </span>
                  <span className="text-sm text-muted">
                    {s._count.participants} participant(s)
                  </span>
                </div>
                <div className="flex gap-2">
                  {s.status === "WAITING" && (
                    <button
                      onClick={() => handleSessionAction(s.id, "ACTIVE")}
                      className="px-3 py-1.5 text-sm bg-success text-white rounded-lg hover:opacity-90 transition"
                    >
                      Start
                    </button>
                  )}
                  {s.status === "ACTIVE" && (
                    <>
                      <Link
                        href={`/teacher/quiz/${quizId}/monitor/${s.id}`}
                        className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                      >
                        Monitor Live
                      </Link>
                      <button
                        onClick={() => handleSessionAction(s.id, "ENDED")}
                        className="px-3 py-1.5 text-sm bg-danger text-white rounded-lg hover:opacity-90 transition"
                      >
                        End
                      </button>
                    </>
                  )}
                  {s.status === "ENDED" && (
                    <Link
                      href={`/teacher/quiz/${quizId}/results/${s.id}`}
                      className="px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition"
                    >
                      View Results
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Questions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Questions ({quiz.questions.length})
          </h2>
          <button
            onClick={() => {
              resetForm();
              setShowQuestionForm(true);
            }}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition"
          >
            + Add Question
          </button>
        </div>

        {/* Question form */}
        {showQuestionForm && (
          <div className="bg-card border-2 border-primary/30 rounded-xl p-6 mb-6">
            <h3 className="font-semibold mb-4">
              {editingQuestion ? "Edit Question" : "New Question"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Type</label>
                <div className="flex gap-2">
                  {(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTypeChange(t)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                        qType === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted hover:border-primary/50"
                      }`}
                    >
                      {t === "MCQ"
                        ? "Multiple Choice"
                        : t === "TRUE_FALSE"
                        ? "True/False"
                        : "Short Answer"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Question Text
                </label>
                <textarea
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Enter your question..."
                />
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {qType === "SHORT_ANSWER" ? "Correct Answer" : "Options"}
                </label>
                <div className="space-y-2">
                  {qOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct"
                        checked={opt.isCorrect}
                        onChange={() =>
                          setQOptions(
                            qOptions.map((o, i) => ({
                              ...o,
                              isCorrect: i === idx,
                            }))
                          )
                        }
                        className="accent-primary"
                        disabled={qType === "SHORT_ANSWER"}
                      />
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) =>
                          setQOptions(
                            qOptions.map((o, i) =>
                              i === idx ? { ...o, text: e.target.value } : o
                            )
                          )
                        }
                        className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder={
                          qType === "SHORT_ANSWER"
                            ? "Expected correct answer"
                            : `Option ${idx + 1}`
                        }
                        disabled={qType === "TRUE_FALSE"}
                      />
                      {qType === "MCQ" && qOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setQOptions(qOptions.filter((_, i) => i !== idx))
                          }
                          className="text-danger text-sm hover:bg-danger/10 px-2 py-1 rounded"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {qType === "MCQ" && qOptions.length < 6 && (
                  <button
                    type="button"
                    onClick={() =>
                      setQOptions([...qOptions, { text: "", isCorrect: false }])
                    }
                    className="text-sm text-primary mt-2 hover:underline"
                  >
                    + Add option
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveQuestion}
                  disabled={!qText.trim()}
                  className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
                >
                  {editingQuestion ? "Update" : "Add"} Question
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 border border-border text-sm rounded-lg hover:bg-primary/5 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Question list */}
        <div className="space-y-3">
          {quiz.questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {q.type === "MCQ"
                        ? "MCQ"
                        : q.type === "TRUE_FALSE"
                        ? "T/F"
                        : "Short"}
                    </span>
                    <span className="text-xs text-muted">Q{idx + 1}</span>
                  </div>
                  <p className="font-medium">{q.text}</p>
                  <div className="mt-2 space-y-1">
                    {q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`text-sm flex items-center gap-2 ${
                          opt.isCorrect ? "text-success font-medium" : "text-muted"
                        }`}
                      >
                        {opt.isCorrect ? "✓" : "○"} {opt.text}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(q)}
                    className="text-sm text-primary hover:bg-primary/10 px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="text-sm text-danger hover:bg-danger/10 px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}
