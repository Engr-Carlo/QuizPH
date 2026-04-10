"use client";

import { useEffect, useState } from "react";
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

interface AdminData {
  users: UserData[];
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

  async function fetchData() {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
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
    { label: "Total Users", value: data.users.length, sub: `${data.stats.teacherCount} teachers · ${data.stats.studentCount} students`, Icon: IconUsers, color: "text-primary", bg: "bg-primary/10 text-primary" },
    { label: "Sessions Run", value: data.stats.sessionCount, sub: `${data.stats.activeSessionCount} active now`, Icon: IconPlay, color: "text-foreground", bg: "bg-surface text-muted" },
    { label: "Participants", value: data.stats.participantCount, sub: `${data.stats.quizCount} quizzes across the platform`, Icon: IconClipboard, color: "text-foreground", bg: "bg-surface text-muted" },
  ];

  const quickLinks = [
    { href: "/admin/users", label: "Manage Users", desc: `${data.users.length} registered accounts`, color: "bg-primary/10 text-primary border-primary/20", icon: <IconUsers /> },
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
    </DashboardLayout>
  );
}
