"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const teacherNav = [
  { href: "/teacher", label: "Dashboard", icon: "📊" },
  { href: "/teacher/quiz/create", label: "Create Quiz", icon: "➕" },
];

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: "🏠" },
  { href: "/admin/users", label: "Users", icon: "👥" },
];

const studentNav = [
  { href: "/student", label: "Dashboard", icon: "🏠" },
  { href: "/student/join", label: "Join Quiz", icon: "🎯" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const role = session?.user?.role;
  const navItems =
    role === "SUPER_ADMIN" ? adminNav : role === "TEACHER" ? teacherNav : studentNav;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <Link href="/" className="text-2xl font-bold text-primary">
            QuizPH
          </Link>
          <p className="text-xs text-muted mt-1 capitalize">
            {role?.toLowerCase().replace("_", " ")}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition",
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-primary/5 hover:text-foreground"
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
              {session?.user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session?.user?.name}</p>
              <p className="text-xs text-muted truncate">{session?.user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-sm text-danger hover:bg-danger/10 py-2 rounded-lg transition"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
