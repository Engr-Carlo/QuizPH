"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count: { quizzes: number };
}

interface AdminData {
  users: UserData[];
  stats: {
    quizCount: number;
    sessionCount: number;
    participantCount: number;
  };
}

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "bg-danger/10 text-danger",
  TEACHER: "bg-primary/10 text-primary",
  STUDENT: "bg-success/10 text-success",
};

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

// Inline SVG donut chart — zero dependencies
function RoleDonut({ teachers, students, admins }: { teachers: number; students: number; admins: number }) {
  const data = [
    { label: "Teachers", value: teachers, color: "#4F46E5" },
    { label: "Students", value: students, color: "#0891B2" },
    { label: "Admins", value: admins, color: "#6B7280" },
  ].filter((d) => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <p className="text-sm text-muted text-center py-4">No user data</p>;
  }
  const r = 42;
  const cx = 55;
  const cy = 55;
  const circ = 2 * Math.PI * r;
  let off = 0;
  const segments = data.map((d) => {
    const dash = (d.value / total) * circ;
    const seg = { ...d, dash, off };
    off += dash;
    return seg;
  });

  return (
    <div className="flex items-center gap-6">
      <svg width="110" height="110" viewBox="0 0 110 110" aria-label="User role distribution donut chart">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth="14" />
        {segments.map(({ label, color, dash, off: segOff }) => (
          <circle
            key={label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={circ * 0.25 - segOff}
          />
        ))}
      </svg>
      <div className="space-y-2.5">
        {data.map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
            <span className="text-sm text-muted">{label}</span>
            <span className="text-sm font-semibold text-foreground ml-2">{value}</span>
          </div>
        ))}
        <p className="text-xs text-muted pt-1">Total: {total} users</p>
      </div>
    </div>
  );
}

// Stat card SVG icons
function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}
function IconPlay() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
function IconAward() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "TEACHER" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [search, setSearch] = useState("");

  async function fetchData() {
    const res = await fetch("/api/admin/users");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

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
          <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  const filteredUsers = data.users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const teacherCount = data.users.filter((u) => u.role === "TEACHER").length;
  const studentCount = data.users.filter((u) => u.role === "STUDENT").length;
  const adminCount = data.users.filter((u) => u.role === "SUPER_ADMIN").length;

  const stats = [
    { label: "Total Users", value: data.users.length, sub: "Registered accounts", color: "text-primary", bg: "bg-primary/8 text-primary", Icon: IconUsers },
    { label: "Total Quizzes", value: data.stats.quizCount, sub: "Created by teachers", color: "text-foreground", bg: "bg-surface text-muted", Icon: IconClipboard },
    { label: "Sessions Run", value: data.stats.sessionCount, sub: "All-time sessions", color: "text-foreground", bg: "bg-surface text-muted", Icon: IconPlay },
    { label: "Participants", value: data.stats.participantCount, sub: "Total entries", color: "text-foreground", bg: "bg-surface text-muted", Icon: IconAward },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
          <p className="text-muted text-sm mt-1">Manage users and monitor platform activity</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition hover:opacity-90"
          style={{ background: "var(--primary)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New User
        </button>
      </div>

      {/* Stats + Chart row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Stats grid (2x2) */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {stats.map(({ label, value, sub, color, bg, Icon }) => (
            <div key={label} className="bg-white border border-border rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${bg}`}>
                <Icon />
              </div>
              <div className={`text-2xl font-bold ${color} mb-0.5`}>{value}</div>
              <div className="text-sm font-medium text-foreground">{label}</div>
              <div className="text-xs text-muted mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {/* Donut chart */}
        <div className="bg-white border border-border rounded-xl p-4 flex flex-col">
          <h2 className="text-sm font-semibold text-foreground mb-4">User Breakdown</h2>
          <div className="flex-1 flex items-center">
            <RoleDonut teachers={teacherCount} students={studentCount} admins={adminCount} />
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-foreground">All Users</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-60 placeholder:text-muted"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-border text-xs font-semibold text-muted uppercase tracking-wide">
                <th className="text-left px-5 py-3">User</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-center px-4 py-3">Quizzes</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`border-b border-border/50 hover:bg-surface/60 transition last:border-0 ${!user.isActive ? "opacity-50" : ""}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: "var(--primary)" }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGE[user.role] || "bg-muted/10 text-muted"}`}>
                      {user.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${user.isActive ? "bg-success/10 text-success" : "bg-muted/10 text-muted"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-success" : "bg-muted"}`} />
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3.5 text-muted font-medium">
                    {user._count.quizzes || "-"}
                  </td>
                  <td className="px-4 py-3.5 text-muted text-xs">
                    {new Date(user.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="text-right px-5 py-3.5">
                    {user.role !== "SUPER_ADMIN" && (
                      <button
                        onClick={() => handleToggleActive(user.id, user.isActive)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition border ${
                          user.isActive
                            ? "border-danger/30 text-danger hover:bg-danger/8"
                            : "border-success/30 text-success hover:bg-success/8"
                        }`}
                      >
                        {user.isActive ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted text-sm">
                    No users found{search ? ` matching "${search}"` : ""}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Create New User</h3>
              <button
                onClick={() => { setShowModal(false); setFormError(""); }}
                className="text-muted hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface transition"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-danger/6 border border-danger/25 text-danger text-sm p-3 rounded-lg">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition placeholder:text-muted"
                  placeholder="Juan dela Cruz"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition placeholder:text-muted"
                  placeholder="user@school.edu"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition placeholder:text-muted"
                    placeholder="Min 6 chars"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  >
                    <option value="TEACHER">Teacher</option>
                    <option value="STUDENT">Student</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(""); }}
                  className="flex-1 py-2.5 border border-border text-muted text-sm font-medium rounded-lg hover:bg-surface transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
                  style={{ background: "var(--primary)" }}
                >
                  {formLoading ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
