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

const AVATAR_COLORS = ["bg-primary", "bg-secondary", "bg-accent", "bg-success", "bg-warning"];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
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
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">Loading dashboardâ€¦</p>
          </div>
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

  const stats = [
    { label: "Total Users", value: data.users.length, sub: "Registered accounts", color: "text-primary", icon: "ðŸ‘¥", bg: "bg-primary/8" },
    { label: "Total Quizzes", value: data.stats.quizCount, sub: "Created by teachers", color: "text-secondary", icon: "ðŸ“‹", bg: "bg-secondary/8" },
    { label: "Sessions Run", value: data.stats.sessionCount, sub: "All-time sessions", color: "text-accent", icon: "ðŸŽ®", bg: "bg-accent/8" },
    { label: "Participants", value: data.stats.participantCount, sub: "Total quiz entries", color: "text-success", icon: "ðŸ†", bg: "bg-success/8" },
  ];

  return (
    <DashboardLayout>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Platform Overview</h1>
          <p className="text-muted text-sm mt-1">Manage users and monitor platform activity</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl shadow-sm transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
        >
          <span className="text-base leading-none">+</span> New User
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, sub, color, icon, bg }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center text-lg`}>
                {icon}
              </div>
            </div>
            <div className={`text-3xl font-extrabold ${color} mb-0.5`}>{value}</div>
            <div className="text-sm font-semibold text-foreground">{label}</div>
            <div className="text-xs text-muted mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Table header row */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
          <h2 className="text-base font-bold text-foreground">All Users</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or emailâ€¦"
            className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-60 placeholder:text-muted"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-border text-xs font-semibold text-muted uppercase tracking-wide">
                <th className="text-left px-6 py-3">User</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-center px-4 py-3">Quizzes</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-right px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`border-b border-border/50 hover:bg-surface/60 transition last:border-0 ${
                    !user.isActive ? "opacity-55" : ""
                  }`}
                >
                  {/* User */}
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(user.name)}`}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{user.name}</p>
                        <p className="text-xs text-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGE[user.role] || "bg-muted/10 text-muted"}`}>
                      {user.role.replace("_", " ")}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="text-center px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      user.isActive ? "bg-success/10 text-success" : "bg-muted/15 text-muted"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-success" : "bg-muted"}`} />
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Quizzes */}
                  <td className="text-center px-4 py-3.5 text-muted font-medium">
                    {user._count.quizzes || "â€”"}
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3.5 text-muted text-xs">
                    {new Date(user.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                  </td>

                  {/* Actions */}
                  <td className="text-right px-6 py-3.5">
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

      {/* â”€â”€ Create User Modal â”€â”€ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border fade-in">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Create New User</h3>
              <button
                onClick={() => { setShowModal(false); setFormError(""); }}
                className="text-muted hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface transition text-xl leading-none"
              >
                Ã—
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-danger/6 border border-danger/25 text-danger text-sm p-3 rounded-xl">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted"
                    placeholder="Juan dela Cruz"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted"
                    placeholder="user@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted"
                    placeholder="Min 6 chars"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    <option value="TEACHER">Teacher</option>
                    <option value="STUDENT">Student</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(""); }}
                  className="flex-1 py-2.5 border border-border text-muted text-sm font-medium rounded-xl hover:bg-surface transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
                >
                  {formLoading ? "Creatingâ€¦" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
