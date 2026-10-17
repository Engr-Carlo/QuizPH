"use client";

import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { AreaChart, Donut, DonutLegend, HBarChart, Sparkline } from "@/components/dashboard/charts";
import {
  HeroBanner,
  IconClipboard,
  IconPlay,
  IconPulse,
  IconUsers,
  Panel,
  SegmentedControl,
  StatCard,
} from "@/components/dashboard/primitives";

interface ChartPoint {
  label: string;
  count: number;
}

interface ActivityEvent {
  type: "session" | "violation";
  label: string;
  desc: string;
  code?: string;
  violationType?: string;
  at: string;
}

interface RouteRow {
  route: string;
  category: string;
  calls: number;
  totalMs: number;
  avgMs: number;
  peakMs: number;
}

interface ComputeData {
  today: { date: string; totalCalls: number; totalMs: number; routes: RouteRow[] };
  categories: Record<string, { calls: number; totalMs: number }>;
  topContributors: { userId: string; name: string; email: string; role: string; route: string; calls: number }[];
  trend: { date: string; totalMs: number; calls: number }[];
}

interface AdminData {
  total: number;
  stats: {
    quizCount: number;
    sessionCount: number;
    participantCount: number;
    onlineUsers: number;
    teacherCount: number;
    studentCount: number;
    adminCount: number;
    activeSessionCount: number;
  };
  charts: {
    usersByDay: ChartPoint[];
    teachersByDay: ChartPoint[];
    studentsByDay: ChartPoint[];
    sessionsByDay: ChartPoint[];
    participantsByDay: ChartPoint[];
    sessionStatus: ChartPoint[];
    onlineByRole: { label: string; online: number; total: number }[];
  };
  recentActivity: ActivityEvent[];
}

const SESSION_STATUS_COLORS: Record<string, string> = {
  Waiting: "var(--warning)",
  Active: "var(--success)",
  Ended: "var(--primary)",
  Archived: "var(--muted)",
};

const CATEGORY_COLORS: Record<string, string> = {
  admin: "var(--primary)",
  session: "var(--success)",
  quiz: "var(--accent)",
  "patch-note": "var(--warning)",
  auth: "var(--danger)",
  other: "var(--muted)",
};

function getTimeAgo(isoString: string): string {
  const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatServerTime(ms: number) {
  return ms >= 60_000 ? `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s` : `${(ms / 1000).toFixed(1)}s`;
}

function ComputeUsage() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ComputeData | null>(null);
  const fetched = useRef(false);

  async function load() {
    if (fetched.current) return;
    fetched.current = true;
    setLoading(true);
    const res = await fetch("/api/admin/compute");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  function toggle() {
    setOpen((value) => !value);
    load();
  }

  const totalMs = data?.today.totalMs ?? 0;
  const totalCalls = data?.today.totalCalls ?? 0;
  const timeTone = totalMs > 30_000 ? "text-danger" : totalMs > 10_000 ? "text-warning" : "text-success";
  const categoryItems = data
    ? Object.entries(data.categories)
        .sort(([, a], [, b]) => b.totalMs - a.totalMs)
        .map(([category, value]) => ({
          label: category.charAt(0).toUpperCase() + category.slice(1),
          value: Number((value.totalMs / 1000).toFixed(1)),
          hint: `${value.calls} calls`,
          color: CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other,
        }))
    : [];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-surface"
      >
        <div>
          <h2 className="text-sm font-semibold text-foreground">Compute usage</h2>
          <p className="mt-0.5 text-xs text-muted">Server time by route, feature, and caller</p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`flex-shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-border p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          ) : data ? (
            <div className="space-y-8">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Calls today", value: totalCalls.toLocaleString(), tone: "text-foreground" },
                  { label: "Total server time", value: formatServerTime(totalMs), tone: timeTone },
                  { label: "Average per call", value: totalCalls > 0 ? `${Math.round(totalMs / totalCalls)}ms` : "–", tone: "text-foreground" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-border bg-surface px-4 py-3">
                    <div className="text-xs font-medium text-muted">{stat.label}</div>
                    <div className={`mt-1 text-xl font-semibold tabular-nums ${stat.tone}`}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                {categoryItems.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Server seconds by feature</h3>
                    <HBarChart items={categoryItems} formatValue={(v) => `${v}s`} />
                  </div>
                )}

                {data.trend.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Server time, last 7 days</h3>
                    <div className="h-48">
                      <AreaChart
                        labels={data.trend.map((t) => t.date.slice(5))}
                        series={[{ name: "Server time", color: "var(--warning)", values: data.trend.map((t) => Number((t.totalMs / 1000).toFixed(1))) }]}
                        integer={false}
                        formatValue={(v) => `${Number(v.toFixed(1))}s`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {data.today.routes.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Top routes today</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted">
                          <th className="pb-2 pr-4 font-medium">Route</th>
                          <th className="pb-2 pr-4 text-right font-medium">Calls</th>
                          <th className="pb-2 pr-4 text-right font-medium">Avg</th>
                          <th className="pb-2 pr-4 text-right font-medium">Peak</th>
                          <th className="pb-2 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[...data.today.routes]
                          .sort((a, b) => b.totalMs - a.totalMs)
                          .map((route) => (
                            <tr key={route.route}>
                              <td className="py-2 pr-4 font-mono text-xs text-foreground">{route.route}</td>
                              <td className="py-2 pr-4 text-right text-xs tabular-nums text-muted">{route.calls}</td>
                              <td
                                className={`py-2 pr-4 text-right text-xs font-medium tabular-nums ${
                                  route.avgMs > 800 ? "text-danger" : route.avgMs > 400 ? "text-warning" : "text-success"
                                }`}
                              >
                                {route.avgMs}ms
                              </td>
                              <td className="py-2 pr-4 text-right text-xs tabular-nums text-muted">{route.peakMs}ms</td>
                              <td className="py-2 text-right text-xs tabular-nums text-muted">{(route.totalMs / 1000).toFixed(2)}s</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {data.topContributors.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Top callers today</h3>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {data.topContributors.slice(0, 10).map((user, index) => (
                      <li key={`${user.userId}-${index}`} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                          {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                          <p className="truncate text-xs text-muted">{user.email}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs font-medium tabular-nums text-foreground">{user.calls} calls</p>
                          <p className="font-mono text-[11px] text-muted">{user.route.replace("/api/", "")}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.today.routes.length === 0 && (
                <p className="py-4 text-center text-sm text-muted">No compute data yet today.</p>
              )}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityMetric, setActivityMetric] = useState<"participants" | "sessions">("participants");
  const [growthMetric, setGrowthMetric] = useState<"students" | "teachers">("students");

  async function fetchData() {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    let interval = setInterval(fetchData, 60_000);

    function onVisibilityChange() {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        fetchData();
        interval = setInterval(fetchData, 60_000);
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  const { stats, charts } = data;
  const roleItems = [
    { label: "Teachers", value: stats.teacherCount, color: "var(--primary)" },
    { label: "Students", value: stats.studentCount, color: "var(--success)" },
    { label: "Admins", value: stats.adminCount, color: "var(--accent)" },
  ];
  const lifecycleItems = charts.sessionStatus.map((item) => ({
    label: item.label,
    value: item.count,
    color: SESSION_STATUS_COLORS[item.label] ?? "var(--muted)",
  }));
  const lifecycleTotal = lifecycleItems.reduce((sum, item) => sum + item.value, 0);

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <HeroBanner
          eyebrow="Administration"
          title="Platform overview"
          description={`${stats.onlineUsers} online now · ${stats.activeSessionCount} session${stats.activeSessionCount === 1 ? "" : "s"} running · ${data.total} registered accounts.`}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Online now" value={stats.onlineUsers} hint="Active in the last 2 minutes" icon={<IconPulse />} tone="success" />
          <StatCard
            label="Total users"
            value={data.total}
            hint={`${stats.teacherCount} teachers · ${stats.studentCount} students`}
            icon={<IconUsers />}
            tone="primary"
            spark={<Sparkline values={charts.usersByDay.map((p) => p.count)} color="var(--primary)" />}
          />
          <StatCard
            label="Sessions run"
            value={stats.sessionCount}
            hint={`${stats.quizCount} quizzes on the platform`}
            icon={<IconPlay />}
            tone="secondary"
            spark={<Sparkline values={charts.sessionsByDay.map((p) => p.count)} color="var(--secondary)" />}
          />
          <StatCard
            label="Participants"
            value={stats.participantCount}
            hint="Total quiz entries"
            icon={<IconClipboard />}
            tone="accent"
            spark={<Sparkline values={charts.participantsByDay.map((p) => p.count)} color="var(--accent)" />}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <Panel
            title="Quiz activity"
            subtitle="Daily totals, last 7 days"
            className="lg:col-span-8"
            action={
              <SegmentedControl
                value={activityMetric}
                onChange={setActivityMetric}
                options={[
                  { value: "participants", label: "Participants" },
                  { value: "sessions", label: "Sessions" },
                ]}
              />
            }
          >
            <div className="h-64">
              <AreaChart
                labels={charts.sessionsByDay.map((p) => p.label)}
                series={[
                  {
                    name: activityMetric === "participants" ? "Participants" : "Sessions",
                    color: activityMetric === "participants" ? "var(--accent)" : "var(--secondary)",
                    values: (activityMetric === "participants" ? charts.participantsByDay : charts.sessionsByDay).map((p) => p.count),
                  },
                ]}
              />
            </div>
          </Panel>

          <Panel title="Accounts" subtitle="Role mix and who is online" className="lg:col-span-4" bodyClassName="space-y-5">
            <div className="flex items-center gap-5">
              <Donut items={roleItems} size={120} centerValue={data.total} centerLabel="users" emptyMessage="No users" />
              <DonutLegend items={roleItems} />
            </div>
            <div className="border-t border-border/70 pt-4">
              <HBarChart
                items={charts.onlineByRole.map((item, index) => ({
                  label: item.label,
                  value: item.online,
                  total: item.total,
                  hint: `of ${item.total} online`,
                  color: ["var(--accent)", "var(--primary)", "var(--success)"][index % 3],
                }))}
              />
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <Panel
            title="Account growth"
            subtitle="New accounts per day"
            className="lg:col-span-4"
            action={
              <SegmentedControl
                value={growthMetric}
                onChange={setGrowthMetric}
                options={[
                  { value: "students", label: "Students" },
                  { value: "teachers", label: "Teachers" },
                ]}
              />
            }
          >
            <div className="h-56">
              <AreaChart
                labels={charts.teachersByDay.map((p) => p.label)}
                series={[
                  {
                    name: growthMetric === "students" ? "Students" : "Teachers",
                    color: growthMetric === "students" ? "var(--success)" : "var(--primary)",
                    values: (growthMetric === "students" ? charts.studentsByDay : charts.teachersByDay).map((p) => p.count),
                  },
                ]}
              />
            </div>
          </Panel>

          <Panel title="Session lifecycle" subtitle="Share of sessions by status" className="lg:col-span-4">
            <div className="flex h-56 flex-col items-center justify-center gap-5">
              <Donut items={lifecycleItems} size={128} centerValue={lifecycleTotal} centerLabel="sessions" emptyMessage="No sessions yet" />
              <div className="flex w-full">
                <DonutLegend items={lifecycleItems} />
              </div>
            </div>
          </Panel>

          <Panel title="Recent activity" subtitle="Sessions and anti-cheat events" className="lg:col-span-4" bodyClassName="max-h-[19.5rem] overflow-y-auto">
            {data.recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No recent activity</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {data.recentActivity.map((event, index) => (
                  <li key={index} className="flex items-start justify-between gap-3 py-2.5 first:pt-0">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span
                        className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${event.type === "violation" ? "bg-danger" : "bg-success"}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{event.label}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {event.desc}
                          {event.code && <span className="ml-1.5 rounded bg-surface px-1.5 py-0.5 font-mono text-[10px]">{event.code}</span>}
                        </p>
                        {event.violationType && (
                          <span className="mt-1 inline-block rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">
                            {event.violationType.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-xs text-muted">{getTimeAgo(event.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <ComputeUsage />
      </div>
    </DashboardLayout>
  );
}
