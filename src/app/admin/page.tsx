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

export default function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "TEACHER",
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  async function fetchData() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
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
      setShowCreateForm(false);
      setFormData({ name: "", email: "", password: "", role: "TEACHER" });
      fetchData();
    } else {
      const err = await res.json();
      setFormError(err.error || "Failed to create user");
    }
    setFormLoading(false);
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });

    if (res.ok) {
      fetchData();
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-3xl font-bold text-primary">
            {data.users.length}
          </div>
          <div className="text-sm text-muted">Total Users</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-3xl font-bold text-secondary">
            {data.stats.quizCount}
          </div>
          <div className="text-sm text-muted">Total Quizzes</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-3xl font-bold text-accent">
            {data.stats.sessionCount}
          </div>
          <div className="text-sm text-muted">Sessions</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-3xl font-bold text-success">
            {data.stats.participantCount}
          </div>
          <div className="text-sm text-muted">Participants</div>
        </div>
      </div>

      {/* Users management */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">All Users</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition"
        >
          {showCreateForm ? "Cancel" : "+ Create User"}
        </button>
      </div>

      {/* Create user form */}
      {showCreateForm && (
        <div className="bg-card border-2 border-primary/30 rounded-xl p-6 mb-6">
          <h3 className="font-semibold mb-4">Create New User</h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="TEACHER">Teacher</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>
            </div>
            {formError && (
              <p className="text-sm text-danger">{formError}</p>
            )}
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
            >
              {formLoading ? "Creating..." : "Create User"}
            </button>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-background">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-center px-4 py-3 font-medium">Role</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-center px-4 py-3 font-medium">Quizzes</th>
              <th className="text-left px-4 py-3 font-medium">Joined</th>
              <th className="text-center px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr
                key={user.id}
                className={`border-t border-border hover:bg-primary/5 ${
                  !user.isActive ? "opacity-60" : ""
                }`}
              >
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3 text-muted">{user.email}</td>
                <td className="text-center px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      user.role === "SUPER_ADMIN"
                        ? "bg-danger/10 text-danger"
                        : user.role === "TEACHER"
                        ? "bg-primary/10 text-primary"
                        : "bg-success/10 text-success"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="text-center px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      user.isActive
                        ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {user.isActive ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="text-center px-4 py-3">
                  {user._count.quizzes}
                </td>
                <td className="px-4 py-3 text-muted">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="text-center px-4 py-3">
                  {user.role !== "SUPER_ADMIN" && (
                    <button
                      onClick={() => handleToggleActive(user.id, user.isActive)}
                      className={`text-xs px-3 py-1 rounded-lg transition ${
                        user.isActive
                          ? "text-danger hover:bg-danger/10"
                          : "text-success hover:bg-success/10"
                      }`}
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
