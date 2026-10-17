"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import LineChart from "@/components/dashboard/LineChart";
import {
  IconChevronRight,
  IconClock,
  IconPlay,
  IconPlus,
  IconQuestion,
  IconQuiz,
  PageHeader,
  Panel,
  StatCard,
  buttonPrimary,
  buttonSecondary,
} from "@/components/dashboard/primitives";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  timerType: string;
  duration: number;
  createdAt: string;
  _count: { questions: number; sessions: number };
}

const CHART_QUIZ_LIMIT = 8;
const RECENT_QUIZ_LIMIT = 5;

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export default function TeacherDashboard() {
  const { data: session } = useSession();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadQuizzes() {
      try {
        const res = await fetch("/api/quiz");
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          setError(payload?.error || "Failed to load quizzes");
          setQuizzes([]);
          return;
        }
        setQuizzes(Array.isArray(payload) ? payload : []);
      } catch {
        setError("Failed to load quizzes");
        setQuizzes([]);
      } finally {
        setLoading(false);
      }
    }
    loadQuizzes();
  }, []);

  const metrics = useMemo(() => {
    const totalQuestions = quizzes.reduce((sum, q) => sum + q._count.questions, 0);
    const totalSessions = quizzes.reduce((sum, q) => sum + q._count.sessions, 0);
    const quizzesWithSessions = quizzes.filter((q) => q._count.sessions > 0).length;
    const avgDurationMins = quizzes.length
      ? Math.round(quizzes.reduce((sum, q) => sum + q.duration, 0) / quizzes.length / 60)
      : 0;
    const avgQuestions = quizzes.length ? Math.round(totalQuestions / quizzes.length) : 0;
    const mostActive = quizzes.reduce<Quiz | null>(
      (best, q) => (q._count.sessions > (best?._count.sessions ?? 0) ? q : best),
      null
    );
    return { totalQuestions, totalSessions, quizzesWithSessions, avgDurationMins, avgQuestions, mostActive };
  }, [quizzes]);

  const newestFirst = useMemo(
    () => [...quizzes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [quizzes]
  );
  const chartQuizzes = useMemo(() => newestFirst.slice(0, CHART_QUIZ_LIMIT).reverse(), [newestFirst]);
  const recentQuizzes = newestFirst.slice(0, RECENT_QUIZ_LIMIT);

  const firstName = session?.user?.name?.split(" ")[0] || "Teacher";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:h-[calc(100dvh-8.5rem)] lg:min-h-[540px]">
        <PageHeader
          title="Dashboard"
          description={`${greeting}, ${firstName}. Here is an overview of your quizzes and sessions.`}
          actions={
            <>
              <Link href="/teacher/my-quizzes" className={buttonSecondary}>
                My quizzes
              </Link>
              <Link href="/teacher/quiz/create" className={buttonPrimary}>
                <IconPlus />
                Create quiz
              </Link>
            </>
          }
        />

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total quizzes"
            value={loading ? "–" : quizzes.length}
            hint={loading ? undefined : `${metrics.quizzesWithSessions} with at least one session`}
            icon={<IconQuiz />}
          />
          <StatCard
            label="Questions"
            value={loading ? "–" : metrics.totalQuestions}
            hint={loading ? undefined : `${metrics.avgQuestions} per quiz on average`}
            icon={<IconQuestion />}
          />
          <StatCard
            label="Sessions run"
            value={loading ? "–" : metrics.totalSessions}
            hint={loading ? undefined : metrics.mostActive ? `Most active: ${metrics.mostActive.title}` : "No sessions yet"}
            icon={<IconPlay />}
          />
          <StatCard
            label="Average duration"
            value={loading ? "–" : `${metrics.avgDurationMins}m`}
            hint={loading ? undefined : "Per quiz"}
            icon={<IconClock />}
          />
        </div>

        {loading ? (
          <div className="grid min-h-[18rem] flex-1 gap-4 lg:grid-cols-3 lg:min-h-0">
            <div className="animate-pulse rounded-xl border border-border bg-white lg:col-span-2" />
            <div className="animate-pulse rounded-xl border border-border bg-white" />
          </div>
        ) : quizzes.length === 0 ? (
          <Panel title="Get started" className="flex-1" bodyClassName="flex items-center justify-center">
            <div className="max-w-sm py-8 text-center">
              <h3 className="text-base font-semibold text-foreground">You have not created a quiz yet</h3>
              <p className="mt-1.5 text-sm text-muted">
                Create your first quiz to run live, monitored sessions with your students.
              </p>
              <Link href="/teacher/quiz/create" className={`${buttonPrimary} mt-5`}>
                <IconPlus />
                Create quiz
              </Link>
            </div>
          </Panel>
        ) : (
          <div className="grid flex-1 gap-4 lg:min-h-0 lg:grid-cols-3">
            <Panel
              title="Sessions per quiz"
              subtitle={`Your ${chartQuizzes.length} most recent quizzes, oldest to newest`}
              className="min-h-[18rem] lg:col-span-2 lg:min-h-0"
              bodyClassName="pt-4"
            >
              <LineChart
                labels={chartQuizzes.map((q) => q.title)}
                series={[{ name: "Sessions", color: "var(--primary)", values: chartQuizzes.map((q) => q._count.sessions) }]}
                emptyMessage="No quizzes to display"
              />
            </Panel>

            <Panel
              title="Recent quizzes"
              subtitle="Latest additions to your library"
              bodyClassName="overflow-y-auto px-2 pt-2"
              action={
                <Link href="/teacher/my-quizzes" className="text-xs font-medium text-primary hover:underline">
                  View all
                </Link>
              }
            >
              <ul className="divide-y divide-border">
                {recentQuizzes.map((quiz) => (
                  <li key={quiz.id}>
                    <Link
                      href={`/teacher/quiz/${quiz.id}`}
                      className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition hover:bg-surface"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{quiz.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {quiz._count.questions} questions · {quiz._count.sessions} sessions · {formatDuration(quiz.duration)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">{formatDate(quiz.createdAt)}</p>
                      </div>
                      <span className="flex-shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-foreground">
                        <IconChevronRight />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
