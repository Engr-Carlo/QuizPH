"use client";

import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import LineChart from "@/components/dashboard/LineChart";
import {
  IconClipboard,
  IconPlay,
  IconPulse,
  IconUsers,
  LegendItem,
  PageHeader,
  Panel,
  StatCard,
} from "@/components/dashboard/primitives";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  isOnline: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  _count: { quizzes: number; participants: number };
}

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
  users: UserData[];
  total: number;
  stats: {
    quizCount: number;
    sessionCount: number;
    participantCount: number;
    archivedSessionCount: number;
    onlineUsers: number;
    teacherCount: number;
    studentCount: number;
    adminCount: number;
    onlineTeachers: number;
    onlineStudents: number;
    onlineAdmins: number;
    waitingSessionCount: number;
    activeSessionCount: number;
    endedSessionCount: number;
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

const SERIES_COLORS = ["var(--primary)", "var(--success)", "var(--warning)", "var(--accent)"];

const CATEGORY_COLORS: Record<string, string> = {
  admin: "#2563EB",
  session: "#059669",
  quiz: "#7C3AED",
  "patch-note": "#D97706",
  auth: "#DC2626",
  other: "#6B7280",
};

function getTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatServerTime(ms: number) {
  return ms >= 60_000 ? `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s` : `${(ms / 1000).toFixed(1)}s`;
}

function RoleDonut({ teachers, students, admins }: { teachers: number; students: number; admins: number }) {
  const data = [
    { label: "Teachers", value: teachers, color: "var(--primary)" },
    { label: "Students", value: students, color: "var(--success)" },
    { label: "Admins", value: admins, color: "var(--danger)" },
  ].filter((item) => item.value > 0);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-muted">No user data</p>;
  }

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = data.map((item) => {
    const dash = (item.value / total) * circumference;
    const segment = { ...item, dash, offset };
    offset += dash;
    return segment;
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-28 w-28 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-label="User role distribution">
          <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="11" style={{ stroke: "var(--border)" }} />
          {segments.map((segment) => (
            <circle
              key={segment.label}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="11"
              stroke={segment.color}
              strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
              strokeDashoffset={-segment.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums text-foreground">{total}</span>
          <span className="text-[11px] text-muted">users</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {data.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
              {item.label}
            </span>
            <span className="font-medium tabular-nums text-foreground">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PresenceList({ items }: { items: { label: string; online: number; total: number }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => {
        const percent = item.total > 0 ? (item.online / item.total) * 100 : 0;
        return (
          <li key={item.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted">{item.label}</span>
              <span className="font-medium tabular-nums text-foreground">
                {item.online} <span className="text-muted">/ {item.total} online</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${percent}%`, background: SERIES_COLORS[index % SERIES_COLORS.length] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SessionLifecycle({ items }: { items: ChartPoint[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
        {items.map((item, index) => (
          <div
            key={item.label}
            title={`${item.label}: ${item.count}`}
            style={{ width: `${total ? (item.count / total) * 100 : 0}%`, background: SERIES_COLORS[index % SERIES_COLORS.length] }}
          />
        ))}
      </div>
      <ul className="mt-4 divide-y divide-border">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center justify-between py-2.5 text-sm">
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: SERIES_COLORS[index % SERIES_COLORS.length] }} />
              {item.label}
            </span>
            <span className="font-medium tabular-nums text-foreground">{item.count}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-muted">{total} sessions in total</p>
    </div>
  );
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

              {Object.keys(data.categories).length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">By feature</h3>
                  <ul className="space-y-3">
                    {Object.entries(data.categories)
                      .sort(([, a], [, b]) => b.totalMs - a.totalMs)
                      .map(([category, value]) => {
                        const pct = totalMs > 0 ? (value.totalMs / totalMs) * 100 : 0;
                        const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
                        return (
                          <li key={category}>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="inline-flex items-center gap-2 font-medium capitalize text-foreground">
                                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                                {category}
                              </span>
                              <span className="tabular-nums text-muted">
                                {value.calls} calls · {(value.totalMs / 1000).toFixed(1)}s ({pct.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              )}

              {data.today.routes.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Top routes today</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs font-medium text-muted">
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

              {data.trend.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Server time, last 7 days (seconds)</h3>
                  <div className="h-52">
                    <LineChart
                      labels={data.trend.map((t) => t.date.slice(5))}
                      series={[{ name: "Server time (s)", color: "var(--warning)", values: data.trend.map((t) => Number((t.totalMs / 1000).toFixed(1))) }]}
                      integer={false}
                      formatValue={(v) => `${Number(v.toFixed(1))}s`}
                    />
                  </div>
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
  const dayLabels = charts.usersByDay.map((point) => point.label);

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <PageHeader title="Admin overview" description="Platform-wide summary of accounts, sessions, and activity." />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Online now"
            value={stats.onlineUsers}
            hint="Active in the last 2 minutes"
            icon={<IconPulse />}
          />
          <StatCard
            label="Total users"
            value={data.total}
            hint={`${stats.teacherCount} teachers · ${stats.studentCount} students`}
            icon={<IconUsers />}
          />
          <StatCard
            label="Sessions run"
            value={stats.sessionCount}
            hint={`${stats.activeSessionCount} active now`}
            icon={<IconPlay />}
          />
          <StatCard
            label="Participants"
            value={stats.participantCount}
            hint={`${stats.quizCount} quizzes on the platform`}
            icon={<IconClipboard />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            title="Platform activity"
            subtitle="Last 7 days"
            className="xl:col-span-2"
            action={
              <div className="flex items-center gap-4">
                <LegendItem color={SERIES_COLORS[0]} label="New users" />
                <LegendItem color={SERIES_COLORS[1]} label="Sessions" />
                <LegendItem color={SERIES_COLORS[2]} label="Participants" />
              </div>
            }
            bodyClassName="pt-4"
          >
            <div className="h-64">
              <LineChart
                labels={dayLabels}
                series={[
                  { name: "New users", color: SERIES_COLORS[0], values: charts.usersByDay.map((p) => p.count) },
                  { name: "Sessions", color: SERIES_COLORS[1], values: charts.sessionsByDay.map((p) => p.count) },
                  { name: "Participants", color: SERIES_COLORS[2], values: charts.participantsByDay.map((p) => p.count) },
                ]}
              />
            </div>
          </Panel>

          <Panel title="Users" subtitle="Role distribution and live presence">
            <div className="space-y-6">
              <RoleDonut teachers={stats.teacherCount} students={stats.studentCount} admins={stats.adminCount} />
              <div className="border-t border-border pt-4">
                <PresenceList items={charts.onlineByRole} />
              </div>
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            title="Account growth"
            subtitle="New accounts, last 7 days"
            action={
              <div className="flex items-center gap-3">
                <LegendItem color={SERIES_COLORS[0]} label="Teachers" />
                <LegendItem color={SERIES_COLORS[1]} label="Students" />
              </div>
            }
            bodyClassName="pt-4"
          >
            <div className="h-56">
              <LineChart
                labels={charts.teachersByDay.map((p) => p.label)}
                series={[
                  { name: "Teachers", color: SERIES_COLORS[0], values: charts.teachersByDay.map((p) => p.count) },
                  { name: "Students", color: SERIES_COLORS[1], values: charts.studentsByDay.map((p) => p.count) },
                ]}
              />
            </div>
          </Panel>

          <Panel title="Session lifecycle" subtitle="Sessions by status">
            <SessionLifecycle items={charts.sessionStatus} />
          </Panel>

          <Panel title="Recent activity" subtitle="Sessions and anti-cheat events" bodyClassName="max-h-72 overflow-y-auto">
            {data.recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No recent activity</p>
            ) : (
              <ul className="divide-y divide-border">
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
