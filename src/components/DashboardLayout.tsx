"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// ── SVG Icons ──────────────────────────────────────────────────────────────
function IconGrid() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconPlusCircle() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconTarget() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function IconHome() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  );
}
function IconLogOut() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ── Nav config ──────────────────────────────────────────────────────────────
const teacherNav = [
  { href: "/teacher", label: "My Quizzes", icon: IconGrid },
  { href: "/teacher/quiz/create", label: "Create Quiz", icon: IconPlusCircle },
];
const adminNav = [
  { href: "/admin", label: "Dashboard", icon: IconHome },
  { href: "/admin", label: "User Management", icon: IconUsers },
];
const studentNav = [
  { href: "/student", label: "Dashboard", icon: IconHome },
  { href: "/student/join", label: "Join a Quiz", icon: IconTarget },
];

const ROLE_META: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: { label: "Super Admin", color: "bg-danger/10 text-danger" },
  TEACHER: { label: "Teacher", color: "bg-primary/10 text-primary" },
  STUDENT: { label: "Student", color: "bg-success/10 text-success" },
};

const AVATAR_COLORS = [
  "bg-primary", "bg-secondary", "bg-accent", "bg-success", "bg-warning",
];

function getAvatarColor(name?: string | null) {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

// ── Component ───────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role;
  const navItems =
    role === "SUPER_ADMIN" ? adminNav : role === "TEACHER" ? teacherNav : studentNav;
  const roleMeta = role ? ROLE_META[role] : null;
  const homeHref = role === "SUPER_ADMIN" ? "/admin" : role === "TEACHER" ? "/teacher" : "/student";

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-card border-r border-border flex flex-col fixed h-full z-20 shadow-sm">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <Link href={homeHref} className="flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
            >
              <span className="text-white font-black text-[13px]">Q</span>
            </div>
            <span className="text-lg font-extrabold text-foreground tracking-tight">QuizPH</span>
          </Link>
        </div>

        {/* Role badge */}
        {roleMeta && (
          <div className="px-5 py-3 border-b border-border/50">
            <span className={cn("inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide uppercase", roleMeta.color)}>
              {roleMeta.label}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }, i) => {
            const isActive = pathname === href || (i === 0 && pathname.startsWith(href) && href !== "/");
            return (
              <Link
                key={`${href}-${i}`}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted hover:bg-surface hover:text-foreground"
                )}
              >
                <span className={cn("flex-shrink-0", isActive ? "text-white" : "")}>
                  <Icon />
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3 min-w-0">
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0",
                getAvatarColor(session?.user?.name)
              )}
            >
              {getInitials(session?.user?.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">
                {session?.user?.name}
              </p>
              <p className="text-xs text-muted truncate">{session?.user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center justify-center gap-2 text-xs font-medium text-muted hover:text-danger hover:bg-danger/8 py-2 rounded-lg transition-all"
          >
            <IconLogOut />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 ml-64 min-h-screen overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
