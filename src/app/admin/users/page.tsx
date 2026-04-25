"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  emailVerifiedAt: string | null;
  _count: { quizzes: number; participants: number };
}

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "bg-danger/10 text-danger",
  TEACHER: "bg-primary/10 text-primary",
  STUDENT: "bg-success/10 text-success",
};

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

const INPUT_CLS = "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm transition placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const SELECT_CLS = "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ teacherCount: 0, studentCount: 0, adminCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userTab, setUserTab] = useState<"ALL" | "TEACHER" | "STUDENT" | "SUPER_ADMIN">("ALL");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "TEACHER" });
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Edit modal
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "" });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Sort
  const [sortKey, setSortKey] = useState<"name" | "role" | "createdAt" | "lastSeenAt" | "">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function handleSort(key: "name" | "role" | "createdAt" | "lastSeenAt") {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <span className="ml-1 opacity-30">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({
      mode: "list",
      page: String(page),
      limit: "25",
      sortBy: sortKey || "name",
      sortDir,
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (userTab !== "ALL") params.set("role", userTab);
    const res = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.stats) setStats(data.stats);
    }
    setLoading(false);
  }, [page, debouncedSearch, userTab, sortKey, sortDir]);

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
  }, [fetchData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    if (res.ok) {
      setShowCreate(false);
      setCreateForm({ name: "", email: "", password: "", role: "TEACHER" });
      fetchData();
    } else {
      const err = await res.json();
      setCreateError(err.error || "Failed to create user");
    }
    setCreateLoading(false);
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchData();
  }

  function openEdit(user: UserData) {
    setEditUser(user);
    setEditForm({ name: user.name, email: user.email, role: user.role });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditError("");
    setEditLoading(true);
    const res = await fetch(`/api/admin/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditUser(null);
      fetchData();
    } else {
      const err = await res.json();
      setEditError(err.error || "Failed to update user");
    }
    setEditLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    setDeleteLoading(false);
    fetchData();
  }

  if (loading && users.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const tabs = [
    { value: "ALL" as const, label: `All (${total})` },
    { value: "TEACHER" as const, label: `Teachers (${stats.teacherCount})` },
    { value: "STUDENT" as const, label: `Students (${stats.studentCount})` },
    { value: "SUPER_ADMIN" as const, label: `Admins (${stats.adminCount})` },
  ];

  const pageStart = total === 0 ? 0 : (page - 1) * 25 + 1;
  const pageEnd = Math.min(page * 25, total);

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="mt-1 text-sm text-muted">Create, edit, activate, and remove user accounts.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: "var(--primary)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New User
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">All Accounts</h2>
            <p className="mt-0.5 text-xs text-muted">Live presence, role, and account status for all registered users.</p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or email..."
            className="w-64 rounded-lg border border-border px-3 py-1.5 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border bg-surface px-5 py-3">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setUserTab(tab.value); setPage(1); }}
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
                <th className="cursor-pointer select-none px-5 py-3 hover:text-foreground" onClick={() => handleSort("name")}>
                  User <SortIcon col="name" />
                </th>
                <th className="cursor-pointer select-none px-4 py-3 hover:text-foreground" onClick={() => handleSort("role")}>
                  Role <SortIcon col="role" />
                </th>
                <th className="cursor-pointer select-none px-4 py-3 text-center hover:text-foreground" onClick={() => handleSort("lastSeenAt")}>
                  Presence <SortIcon col="lastSeenAt" />
                </th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Workload</th>
                <th className="cursor-pointer select-none px-4 py-3 hover:text-foreground" onClick={() => handleSort("createdAt")}>
                  Joined <SortIcon col="createdAt" />
                </th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={`border-b border-border/50 transition hover:bg-surface/60 last:border-0 ${!user.isActive ? "opacity-60" : ""}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{getInitials(user.name)}</div>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-muted">{user.email}</p>
                          {user.emailVerifiedAt ? (
                            <span className="rounded-full bg-success/10 px-1.5 py-px text-[9px] font-bold text-success">✓</span>
                          ) : (
                            <span className="rounded-full bg-muted/10 px-1.5 py-px text-[9px] font-bold text-muted">✗</span>
                          )}
                        </div>
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
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-primary/30 hover:text-primary"
                      >
                        Edit
                      </button>
                      {user.role !== "SUPER_ADMIN" && (
                        <button
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${user.isActive ? "border-warning/30 text-warning hover:bg-warning/8" : "border-success/30 text-success hover:bg-success/8"}`}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      )}
                      {user.role !== "SUPER_ADMIN" && (
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/8"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted">
                    No users found{debouncedSearch ? ` matching "${debouncedSearch}"` : ""}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-muted">
              Showing {pageStart}–{pageEnd} of {total} users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground disabled:opacity-40"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p: number;
                if (totalPages <= 7) p = i + 1;
                else if (page <= 4) p = i + 1;
                else if (page >= totalPages - 3) p = totalPages - 6 + i;
                else p = page - 3 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-7 w-7 rounded-lg text-xs font-semibold transition ${
                      p === page ? "bg-primary text-white" : "border border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-semibold text-foreground">Create New User</h3>
              <button onClick={() => { setShowCreate(false); setCreateError(""); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-foreground" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 px-6 py-5">
              {createError && <div className="rounded-lg border border-danger/25 bg-danger/6 p-3 text-sm text-danger">{createError}</div>}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Full Name</label>
                <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className={INPUT_CLS} placeholder="Juan dela Cruz" required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Email address</label>
                <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className={INPUT_CLS} placeholder="user@school.edu" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
                  <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className={INPUT_CLS} placeholder="Min 6 chars" required minLength={6} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Role</label>
                  <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className={SELECT_CLS}>
                    <option value="TEACHER">Teacher</option>
                    <option value="STUDENT">Student</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowCreate(false); setCreateError(""); }} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted transition hover:bg-surface">Cancel</button>
                <button type="submit" disabled={createLoading} className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-50" style={{ background: "var(--primary)" }}>{createLoading ? "Creating..." : "Create User"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-semibold text-foreground">Edit User</h3>
              <button onClick={() => setEditUser(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-foreground" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4 px-6 py-5">
              {editError && <div className="rounded-lg border border-danger/25 bg-danger/6 p-3 text-sm text-danger">{editError}</div>}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Full Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={INPUT_CLS} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Email address</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={INPUT_CLS} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Role</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className={SELECT_CLS}>
                  <option value="TEACHER">Teacher</option>
                  <option value="STUDENT">Student</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditUser(null)} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted transition hover:bg-surface">Cancel</button>
                <button type="submit" disabled={editLoading} className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-50" style={{ background: "var(--primary)" }}>{editLoading ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white shadow-2xl">
            <div className="px-6 py-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
              </div>
              <h3 className="text-base font-semibold text-foreground">Delete {deleteTarget.name}?</h3>
              <p className="mt-2 text-sm text-muted">This will permanently remove their account, quizzes, and all associated data. This cannot be undone.</p>
            </div>
            <div className="flex gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted transition hover:bg-surface">Cancel</button>
              <button onClick={handleDelete} disabled={deleteLoading} className="flex-1 rounded-lg bg-danger py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 hover:opacity-90">{deleteLoading ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
