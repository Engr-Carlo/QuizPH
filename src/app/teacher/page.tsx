"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { AreaChart, Donut, DonutLegend, Sparkline } from "@/components/dashboard/charts";
import { CoverArt } from "@/components/dashboard/CoverArt";
import {
  HeroBanner,
  IconChevronRight,
  IconPlay,
  IconPlus,
  IconQuiz,
  IconTarget,
  IconUsers,
  Panel,
  SegmentedControl,
  StatCard,
  StatusPill,
  buttonGhostOnPhoto,
  buttonOnPhoto,
  type Tone,
} from "@/components/dashboard/primitives";
import { DashboardVideoCard } from "@/components/dashboard/VideoCard";

interface TeacherStats {
  totals: {
    quizzes: number;
    questions: number;
    sessions: number;
    liveSessions: number;
    students: number;
    attempts: number;
    completionRate: number | null;
    avgScore: number | null;
    violations: number;
  };
  months: { label: string; sessions: number; participants: number }[];
  scoreBands: { label: string; count: number }[];
  recentSessions: {
    id: string;
    code: string;
    status: "WAITING" | "ACTIVE" | "ENDED";
    createdAt: string;
    quizId: string;
    quizTitle: string;
    participants: number;
  }[];
}

const BAND_COLORS = ["var(--success)", "var(--primary)", "var(--warning)", "var(--danger)"];

const STATUS_META: Record<TeacherStats["recentSessions"][number]["status"], { label: string; tone: Tone }> = {
  ACTIVE: { label: "Live", tone: "success" },
  WAITING: { label: "Waiting", tone: "warning" },
  ENDED: { label: "Ended", tone: "neutral" },
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function TeacherDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metric, setMetric] = useState<"participants" | "sessions">("participants");

  useEffect(() => {
    async function load() {
      let message = "Failed to load dashboard data";
      // Neon can take a few seconds to wake; one retry hides that from the user.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch("/api/teacher/stats");
          const payload = await res.json().catch(() => null);
          if (res.ok) {
            setStats(payload);
            setLoading(false);
            return;
          }
          message = payload?.error || message;
          if (res.status < 500) break;
        } catch {
          // network error: fall through to retry
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      setError(message);
      setLoading(false);
    }
    load();
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] || "Teacher";
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const today = now.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" });

  const totals = stats?.totals;
  const dash = (value: number | string | null | undefined) => (loading || value === null || value === undefined ? "–" : value);
  const bandItems = (stats?.scoreBands ?? []).map((band, index) => ({ ...band, value: band.count, color: BAND_COLORS[index] }));
  const hasQuizzes = (totals?.quizzes ?? 0) > 0;

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:h-[calc(100dvh-8.5rem)] lg:min-h-[560px]">
        <HeroBanner
          eyebrow={today}
          title={`${greeting}, ${firstName}`}
          description={
            totals?.liveSessions
              ? `${totals.liveSessions} session${totals.liveSessions === 1 ? " is" : "s are"} live right now.`
              : "Here is how your classes are doing."
          }
          actions={
            <>
              <Link href="/teacher/my-quizzes" className={buttonGhostOnPhoto}>
                My quizzes
              </Link>
              <Link href="/teacher/quiz/create" className={buttonOnPhoto}>
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
            label="Quizzes"
            value={dash(totals?.quizzes)}
            hint={totals ? `${totals.questions} questions in your library` : undefined}
            icon={<IconQuiz />}
            tone="primary"
          />
          <StatCard
            label="Sessions run"
            value={dash(totals?.sessions)}
            hint={totals ? `${totals.liveSessions} live now` : undefined}
            icon={<IconPlay />}
            tone="secondary"
            spark={stats && <Sparkline values={stats.months.map((d) => d.sessions)} color="var(--secondary)" />}
          />
          <StatCard
            label="Students reached"
            value={dash(totals?.students)}
            hint={totals ? `${totals.attempts} attempts total` : undefined}
            icon={<IconUsers />}
            tone="accent"
            spark={stats && <Sparkline values={stats.months.map((d) => d.participants)} color="var(--accent)" />}
          />
          <StatCard
            label="Average score"
            value={totals?.avgScore == null ? dash(null) : `${totals.avgScore}%`}
            hint={
              totals
                ? `${totals.completionRate ?? 0}% completion · ${totals.violations} flag${totals.violations === 1 ? "" : "s"}`
                : undefined
            }
            icon={<IconTarget />}
            tone="success"
          />
        </div>

        <div className="grid flex-1 gap-4 lg:min-h-0 lg:grid-cols-12">
          <div className="grid gap-4 lg:col-span-8 lg:min-h-0 lg:grid-cols-8">
        {!loading && !error && !hasQuizzes ? (
          <Panel title="Get started" className="lg:col-span-8" bodyClassName="flex items-center justify-center">
            <div className="max-w-sm py-8 text-center">
              <h3 className="text-base font-semibold text-foreground">You have not created a quiz yet</h3>
              <p className="mt-1.5 text-sm text-muted">
                Create your first quiz to run live, monitored sessions with your students.
              </p>
              <Link
                href="/teacher/quiz/create"
                className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark"
              >
                <IconPlus />
                Create quiz
              </Link>
            </div>
          </Panel>
        ) : (
          <>
            <Panel
              title="Activity"
              subtitle="Monthly totals, last 12 months"
              className="lg:col-span-5"
              bodyClassName="relative"
              action={
                <SegmentedControl
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { value: "participants", label: "Students" },
                    { value: "sessions", label: "Sessions" },
                  ]}
                />
              }
            >
              <div className="h-60 lg:absolute lg:inset-x-5 lg:inset-y-4 lg:h-auto">
                <AreaChart
                  labels={(stats?.months ?? []).map((d) => d.label)}
                  series={[
                    {
                      name: metric === "participants" ? "Students" : "Sessions",
                      color: metric === "participants" ? "var(--accent)" : "var(--secondary)",
                      values: (stats?.months ?? []).map((d) => d[metric]),
                    },
                  ]}
                  emptyMessage={loading ? "Loading…" : "No activity yet"}
                />
              </div>
            </Panel>

            <Panel title="Score distribution" subtitle="Completed attempts" className="lg:col-span-3" bodyClassName="flex flex-col items-center gap-5">
              <Donut
                items={bandItems}
                size={128}
                centerValue={totals?.avgScore == null ? "–" : `${totals.avgScore}%`}
                centerLabel="average"
                emptyMessage={loading ? "Loading…" : "No completed attempts yet"}
              />
              <div className="flex w-full">
                <DonutLegend items={bandItems} />
              </div>
            </Panel>
          </>
        )}
          </div>

          <div className="flex flex-col gap-4 lg:col-span-4 lg:min-h-0">
            <DashboardVideoCard
              title="Product tour"
              description="See how quizzes, sessions and monitoring fit together."
            />
            <Panel
              title="Recent sessions"
              subtitle="Latest activity across your quizzes"
              className="min-h-[200px] flex-1"
              bodyClassName="overflow-y-auto px-2 py-2"
            >
              {stats && stats.recentSessions.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">No sessions yet. Start one from any quiz.</p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {(stats?.recentSessions ?? []).map((row) => {
                    const meta = STATUS_META[row.status];
                    const href =
                      row.status === "ENDED"
                        ? `/teacher/quiz/${row.quizId}/results/${row.id}`
                        : `/teacher/quiz/${row.quizId}/monitor/${row.id}`;
                    return (
                      <li key={row.id}>
                        <Link href={href} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-surface">
                          <CoverArt seed={row.quizId} className="h-10 w-10 flex-shrink-0 rounded-lg" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{row.quizTitle}</p>
                            <p className="mt-0.5 truncate text-xs text-muted">
                              {row.status !== "ENDED" && <span className="mr-1.5 font-mono">{row.code}</span>}
                              {row.participants} student{row.participants === 1 ? "" : "s"} · {timeAgo(row.createdAt)}
                            </p>
                          </div>
                          <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                          <span className="flex-shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-foreground">
                            <IconChevronRight />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
