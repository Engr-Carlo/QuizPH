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

export default function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "TEACHER" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [userTab, setUserTab] = useState<"ALL" | "TEACHER" | "STUDENT" | "SUPER_ADMIN">("ALL");

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

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      setShowModal(false);
      setFormData({ name: "", email: "", password: "", role: "TEACHER" });
      fetchData();
    } else {
      const err = await res.json();
      setFormError(err.error || "Failed to create user");
    }
    setFormLoading(false);
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchData();
  }

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

  const filteredUsers = data.users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = userTab === "ALL" ? true : user.role === userTab;
    return matchesSearch && matchesRole;
  });

  const stats = [
    { label: "Online Now", value: data.stats.onlineUsers, sub: "Active in the last 2 minutes", Icon: IconPulse, color: "text-success", bg: "bg-success/10 text-success" },
    { label: "Total Users", value: data.users.length, sub: "Registered accounts", Icon: IconUsers, color: "text-primary", bg: "bg-primary/10 text-primary" },
    { label: "Sessions Run", value: data.stats.sessionCount, sub: `${data.stats.activeSessionCount} active, ${data.stats.archivedSessionCount} archived`, Icon: IconPlay, color: "text-foreground", bg: "bg-surface text-muted" },
    { label: "Participants", value: data.stats.participantCount, sub: `${data.stats.quizCount} quizzes across the platform`, Icon: IconClipboard, color: "text-foreground", bg: "bg-surface text-muted" },
  ];

  const tabs = [
    { value: "ALL" as const, label: `All (${data.users.length})` },
    { value: "TEACHER" as const, label: `Teachers (${data.stats.teacherCount})` },
    { value: "STUDENT" as const, label: `Students (${data.stats.studentCount})` },
    { value: "SUPER_ADMIN" as const, label: `Admins (${data.stats.adminCount})` },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Monitor</h1>
          <p className="mt-1 text-sm text-muted">Track platform activity, user presence, and account health in one place.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: "var(--primary)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New User
        </button>
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

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <BarTrend title="Teacher Account Growth" points={data.charts.teachersByDay} color="var(--primary)" />
        <BarTrend title="Student Account Growth" points={data.charts.studentsByDay} color="var(--success)" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">User Monitor</h2>
            <p className="mt-0.5 text-xs text-muted">Teachers, students, and admins are separated into role tabs, with live online visibility.</p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-64 rounded-lg border border-border px-3 py-1.5 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border bg-surface px-5 py-3">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setUserTab(tab.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${userTab === tab.value ? "bg-primary text-white" : "bg-white text-muted hover:text-foreground"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-5 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-center">Presence</th>
                <th className="px-4 py-3 text-center">Account</th>
                <th className="px-4 py-3 text-center">Workload</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className={`border-b border-border/50 transition hover:bg-surface/60 last:border-0 ${!user.isActive ? "opacity-60" : ""}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{getInitials(user.name)}</div>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ROLE_BADGE[user.role] || "bg-muted/10 text-muted"}`}>
                      {user.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="inline-flex flex-col items-center gap-1">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${user.isOnline ? "bg-success/10 text-success" : "bg-muted/10 text-muted"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.isOnline ? "bg-success" : "bg-muted"}`} />
                        {user.isOnline ? "Online" : "Offline"}
                      </span>
                      <span className="text-[10px] text-muted">{user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "No activity yet"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${user.isActive ? "bg-success/10 text-success" : "bg-muted/10 text-muted"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-success" : "bg-muted"}`} />
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-xs text-muted">
                    {user.role === "TEACHER" ? `${user._count.quizzes} quizzes` : `${user._count.participants} joins`}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted">
                    {new Date(user.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {user.role !== "SUPER_ADMIN" && (
                      <button
                        onClick={() => handleToggleActive(user.id, user.isActive)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${user.isActive ? "border-danger/30 text-danger hover:bg-danger/8" : "border-success/30 text-success hover:bg-success/8"}`}
                      >
                        {user.isActive ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted">
                    No users found{search ? ` matching "${search}"` : ""}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-semibold text-foreground">Create New User</h3>
              <button onClick={() => { setShowModal(false); setFormError(""); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-foreground" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 px-6 py-5">
              {formError && <div className="rounded-lg border border-danger/25 bg-danger/6 p-3 text-sm text-danger">{formError}</div>}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Full Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm transition placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Juan dela Cruz" required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Email address</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm transition placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="user@school.edu" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm transition placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Min 6 chars" required minLength={6} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Role</label>
                  <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="TEACHER">Teacher</option>
                    <option value="STUDENT">Student</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowModal(false); setFormError(""); }} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted transition hover:bg-surface">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-50" style={{ background: "var(--primary)" }}>{formLoading ? "Creating..." : "Create User"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
