"use client";

import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

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

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "bg-danger/10 text-danger",
  TEACHER: "bg-primary/10 text-primary",
  STUDENT: "bg-success/10 text-success",
};

const BAR_COLORS = ["var(--primary)", "var(--secondary)", "var(--accent)", "var(--success)", "var(--warning)"];

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

function getTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function RoleDonut({ teachers, students, admins }: { teachers: number; students: number; admins: number }) {
  const data = [
    { label: "Teachers", value: teachers, color: "#2563EB" },
    { label: "Students", value: students, color: "#059669" },
    { label: "Admins", value: admins, color: "#DC2626" },
  ].filter((item) => item.value > 0);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return <p className="py-8 text-center text-sm text-muted">No user data</p>;
  }

  const r = 44;
  const cx = 58;
  const cy = 58;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const segments = data.map((item) => {
    const dash = (item.value / total) * circ;
    const segment = { ...item, dash, offset };
    offset += dash;
    return segment;
  });

  return (
    <div className="flex items-center gap-6">
      <svg width="116" height="116" viewBox="0 0 116 116" aria-label="User role distribution">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E5E7EB" strokeWidth="14" />
        {segments.map((segment) => (
          <circle
            key={segment.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={segment.color}
            strokeWidth="14"
            strokeDasharray={`${segment.dash} ${circ - segment.dash}`}
            strokeDashoffset={circ * 0.25 - segment.offset}
          />
        ))}
      </svg>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
            <span className="text-muted">{item.label}</span>
            <span className="font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
        <p className="pt-1 text-xs text-muted">Total: {total} users</p>
      </div>
    </div>
  );
}

function BarTrend({ title, points, color }: { title: string; points: ChartPoint[]; color: string }) {
  const max = Math.max(...points.map((point) => point.count), 1);

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-4 flex h-44 items-end gap-3">
        {points.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-[11px] font-semibold text-foreground">{point.count}</span>
            <div className="flex h-28 w-full items-end rounded-t-xl bg-slate-100 px-1">
              <div
                className="w-full rounded-t-lg transition-all"
                style={{ height: `${Math.max((point.count / max) * 100, point.count > 0 ? 10 : 4)}%`, background: color }}
              />
            </div>
            <span className="text-[10px] text-muted">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StackedMeter({ title, items }: { title: string; items: ChartPoint[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0) || 1;

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-4 overflow-hidden rounded-full bg-slate-100">
        <div className="flex h-4 w-full">
          {items.map((item, index) => (
            <div
              key={item.label}
              style={{ width: `${(item.count / total) * 100}%`, background: BAR_COLORS[index % BAR_COLORS.length] }}
              title={`${item.label}: ${item.count}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item, index) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: BAR_COLORS[index % BAR_COLORS.length] }} />
              <span className="text-muted">{item.label}</span>
            </div>
            <span className="font-semibold text-foreground">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OnlineByRole({ items }: { items: { label: string; online: number; total: number }[] }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <h3 className="text-sm font-semibold text-foreground">Live Presence by Role</h3>
      <div className="mt-4 space-y-4">
        {items.map((item, index) => {
          const percent = item.total > 0 ? (item.online / item.total) * 100 : 0;
          return (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-muted">{item.label}</span>
                <span className="font-semibold text-foreground">{item.online}/{item.total}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${percent}%`, background: BAR_COLORS[index % BAR_COLORS.length] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IconUsers() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function IconClipboard() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>;
}
function IconPlay() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>;
}
function IconPulse() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
}
function IconShield() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [computeData, setComputeData] = useState<ComputeData | null>(null);
  const [computeOpen, setComputeOpen] = useState(false);
  const [computeLoading, setComputeLoading] = useState(false);
  const computeFetched = useRef(false);

  async function fetchData() {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  async function fetchCompute() {
    if (computeFetched.current) return;
    computeFetched.current = true;
    setComputeLoading(true);
    const res = await fetch("/api/admin/compute");
    if (res.ok) setComputeData(await res.json());
    setComputeLoading(false);
  }

  function toggleCompute() {
    setComputeOpen((o) => !o);
    fetchCompute();
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
          <div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  const stats = [
    { label: "Online Now", value: data.stats.onlineUsers, sub: "Active in the last 2 minutes", Icon: IconPulse, color: "text-success", bg: "bg-success/10 text-success" },
    { label: "Total Users", value: data.total, sub: `${data.stats.teacherCount} teachers · ${data.stats.studentCount} students`, Icon: IconUsers, color: "text-primary", bg: "bg-primary/10 text-primary" },
    { label: "Sessions Run", value: data.stats.sessionCount, sub: `${data.stats.activeSessionCount} active now`, Icon: IconPlay, color: "text-foreground", bg: "bg-surface text-muted" },
    { label: "Participants", value: data.stats.participantCount, sub: `${data.stats.quizCount} quizzes across the platform`, Icon: IconClipboard, color: "text-foreground", bg: "bg-surface text-muted" },
  ];

  const quickLinks = [
    { href: "/admin/users", label: "Manage Users", desc: `${data.total} registered accounts`, color: "bg-primary/10 text-primary border-primary/20", icon: <IconUsers /> },
    { href: "/admin/quizzes", label: "Browse Quizzes", desc: `${data.stats.quizCount} quizzes on platform`, color: "bg-secondary/10 text-secondary border-secondary/20", icon: <IconClipboard /> },
    { href: "/admin/sessions", label: "Monitor Sessions", desc: `${data.stats.activeSessionCount} active right now`, color: "bg-success/10 text-success border-success/20", icon: <IconPlay /> },
    { href: "/admin/violations", label: "View Violations", desc: "Anti-cheat logs by session", color: "bg-danger/10 text-danger border-danger/20", icon: <IconShield /> },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="mt-1 text-sm text-muted">Platform-wide summary. Use the sidebar to manage specific sections.</p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, sub, Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-border bg-white p-4">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
              <Icon />
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="mt-0.5 text-sm font-medium text-foreground">{label}</div>
            <div className="mt-0.5 text-xs text-muted">{sub}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map(({ href, label, desc, color, icon }) => (
          <a key={href} href={href} className={`flex items-center gap-4 rounded-xl border p-4 transition hover:shadow-md ${color} bg-white`}>
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${color}`}>{icon}</div>
            <div>
              <p className="font-semibold text-foreground text-sm">{label}</p>
              <p className="text-xs text-muted mt-0.5">{desc}</p>
            </div>
          </a>
        ))}
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr]">
        <div className="rounded-xl border border-border bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-foreground">User Breakdown</h2>
          <RoleDonut teachers={data.stats.teacherCount} students={data.stats.studentCount} admins={data.stats.adminCount} />
        </div>
        <OnlineByRole items={data.charts.onlineByRole} />
        <StackedMeter title="Session Lifecycle" items={data.charts.sessionStatus} />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        <BarTrend title="New Users (7 days)" points={data.charts.usersByDay} color="var(--primary)" />
        <BarTrend title="New Sessions (7 days)" points={data.charts.sessionsByDay} color="var(--secondary)" />
        <BarTrend title="Participant Entries (7 days)" points={data.charts.participantsByDay} color="var(--accent)" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BarTrend title="Teacher Account Growth" points={data.charts.teachersByDay} color="var(--primary)" />
        <BarTrend title="Student Account Growth" points={data.charts.studentsByDay} color="var(--success)" />
      </div>

      {/* Recent Activity */}
      {data.recentActivity.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Recent Activity</h2>
          <div className="relative pl-5">
            <div className="absolute left-2 top-0 h-full w-px bg-border" />
            {data.recentActivity.map((ev, idx) => (
              <div key={idx} className="relative mb-4 last:mb-0">
                <div className={`absolute -left-[13px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${
                  ev.type === "violation" ? "bg-danger" : "bg-success"
                }`} />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{ev.label}</p>
                    <p className="mt-0.5 text-xs text-muted">{ev.desc}{ev.code && <span className="ml-1.5 rounded bg-surface px-1.5 py-0.5 font-mono text-[10px]">{ev.code}</span>}</p>
                    {ev.violationType && (
                      <span className="mt-1 inline-block rounded-full bg-danger/8 px-2 py-0.5 text-[10px] font-semibold text-danger">{ev.violationType.replace("_", " ")}</span>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-[11px] text-muted">{getTimeAgo(ev.at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compute Usage Widget */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-white">
        <button
          onClick={toggleCompute}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-surface/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="14" x2="22" y2="14"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="14" x2="4" y2="14"/></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Compute Usage</p>
              <p className="text-xs text-muted">Track CPU usage by route, feature, and user — click to expand</p>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`text-muted transition-transform ${computeOpen ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        {computeOpen && (
          <div className="border-t border-border p-5">
            {computeLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-warning" />
              </div>
            ) : computeData ? (
              <div className="space-y-6">
                {/* Today summary */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Total Calls Today", value: computeData.today.totalCalls.toLocaleString(), color: "text-foreground" },
                    { label: "Total Server Time", value: computeData.today.totalMs >= 60000 ? `${Math.floor(computeData.today.totalMs / 60000)}m ${Math.round((computeData.today.totalMs % 60000) / 1000)}s` : `${(computeData.today.totalMs / 1000).toFixed(1)}s`, color: computeData.today.totalMs > 30000 ? "text-danger" : computeData.today.totalMs > 10000 ? "text-warning" : "text-success" },
                    { label: "Avg per Call", value: computeData.today.totalCalls > 0 ? `${Math.round(computeData.today.totalMs / computeData.today.totalCalls)}ms` : "—", color: "text-muted" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-border bg-surface p-3 text-center">
                      <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="mt-0.5 text-xs text-muted">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Category breakdown */}
                {Object.keys(computeData.categories).length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">By Feature Category</h3>
                    <div className="space-y-2">
                      {Object.entries(computeData.categories)
                        .sort(([, a], [, b]) => b.totalMs - a.totalMs)
                        .map(([cat, v]) => {
                          const pct = computeData.today.totalMs > 0 ? (v.totalMs / computeData.today.totalMs) * 100 : 0;
                          const CAT_COLOR: Record<string, string> = { admin: "#2563EB", session: "#059669", quiz: "#7C3AED", "patch-note": "#D97706", auth: "#DC2626", other: "#6B7280" };
                          return (
                            <div key={cat}>
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full" style={{ background: CAT_COLOR[cat] ?? "#6B7280" }} />
                                  <span className="font-medium text-foreground capitalize">{cat}</span>
                                </div>
                                <span className="text-muted">{v.calls} calls · {(v.totalMs / 1000).toFixed(1)}s ({pct.toFixed(0)}%)</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CAT_COLOR[cat] ?? "#6B7280" }} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Route breakdown table */}
                {computeData.today.routes.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Top Routes Today</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                            <th className="pb-2 pr-4">Route</th>
                            <th className="pb-2 pr-4 text-right">Calls</th>
                            <th className="pb-2 pr-4 text-right">Avg ms</th>
                            <th className="pb-2 pr-4 text-right">Peak ms</th>
                            <th className="pb-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {[...computeData.today.routes].sort((a, b) => b.totalMs - a.totalMs).map((r) => (
                            <tr key={r.route}>
                              <td className="py-2 pr-4 font-mono text-[11px] text-foreground">{r.route}</td>
                              <td className="py-2 pr-4 text-right text-xs text-muted">{r.calls}</td>
                              <td className={`py-2 pr-4 text-right text-xs font-medium ${r.avgMs > 800 ? "text-danger" : r.avgMs > 400 ? "text-warning" : "text-success"}`}>{r.avgMs}ms</td>
                              <td className="py-2 pr-4 text-right text-xs text-muted">{r.peakMs}ms</td>
                              <td className="py-2 text-right text-xs text-muted">{(r.totalMs / 1000).toFixed(2)}s</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Top contributors */}
                {computeData.topContributors.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Top Callers Today</h3>
                    <div className="space-y-2">
                      {computeData.topContributors.slice(0, 10).map((u, idx) => (
                        <div key={idx} className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                            {u.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                            <p className="text-[11px] text-muted">{u.email}</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-xs font-semibold text-foreground">{u.calls}×</p>
                            <p className="text-[10px] font-mono text-muted">{u.route.replace("/api/", "")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7-day trend */}
                {computeData.trend.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">7-Day Server Time Trend</h3>
                    <div className="flex h-20 items-end gap-2">
                      {(() => {
                        const maxMs = Math.max(...computeData.trend.map((t) => t.totalMs), 1);
                        return computeData.trend.map((t) => (
                          <div key={t.date} className="flex flex-1 flex-col items-center gap-1" title={`${t.date}: ${(t.totalMs / 1000).toFixed(1)}s`}>
                            <div className="flex w-full items-end justify-center" style={{ height: 56 }}>
                              <div
                                className="w-full rounded-t-lg"
                                style={{
                                  height: `${Math.max((t.totalMs / maxMs) * 100, t.totalMs > 0 ? 8 : 3)}%`,
                                  background: t.totalMs > 30000 ? "var(--danger)" : t.totalMs > 10000 ? "var(--warning)" : "var(--success)",
                                }}
                              />
                            </div>
                            <span className="text-[9px] text-muted">{t.date.slice(5)}</span>
                          </div>
                        ));
                      })()}
                    </div>
                    <p className="mt-2 text-[10px] text-muted">Green = low · Yellow = medium · Red = high usage</p>
                  </div>
                )}

                {computeData.today.routes.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted">No compute data yet today. Data appears once instrumented routes are called.</p>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
