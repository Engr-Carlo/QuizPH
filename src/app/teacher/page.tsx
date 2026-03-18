"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  timerType: string;
  duration: number;
  createdAt: string;
  _count: { questions: number; sessions: number };
}

export default function TeacherDashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/quiz")
      .then((r) => r.json())
      .then((data) => {
        setQuizzes(data);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">My Quizzes</h1>
          <p className="text-muted text-sm mt-1">Create and manage your quizzes</p>
        </div>
        <Link
          href="/teacher/quiz/create"
          className="px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition"
        >
          + Create Quiz
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted">Loading quizzes...</div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="font-semibold text-lg mb-2">No quizzes yet</h3>
          <p className="text-muted text-sm mb-4">
            Create your first quiz to get started
          </p>
          <Link
            href="/teacher/quiz/create"
            className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
          >
            Create Quiz
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/teacher/quiz/${quiz.id}`}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition group"
            >
              <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition">
                {quiz.title}
              </h3>
              {quiz.description && (
                <p className="text-muted text-sm mb-3 line-clamp-2">
                  {quiz.description}
                </p>
              )}
              <div className="flex gap-4 text-xs text-muted">
                <span>📋 {quiz._count.questions} questions</span>
                <span>🎮 {quiz._count.sessions} sessions</span>
                <span>⏱️ {Math.floor(quiz.duration / 60)}min</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
