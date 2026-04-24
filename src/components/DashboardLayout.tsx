"use client";

import { useEffect, useRef, useState } from "react";
import PatchNoteModal from "@/components/PatchNoteModal";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import { getAvatarUrl } from "@/lib/avatar-presets";

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
function IconMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
  );
}
function IconPlay() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconMegaphone() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

// ── Nav config ──────────────────────────────────────────────────────────────
type NavItem = { href: string; label: string; icon: () => React.ReactElement; matchPrefix?: boolean };

const teacherNav: NavItem[] = [
  { href: "/teacher", label: "My Quizzes", icon: IconGrid, matchPrefix: true },
  { href: "/teacher/quiz/create", label: "Create Quiz", icon: IconPlusCircle },
  { href: "/guide", label: "Guide", icon: IconBook },
  { href: "/settings", label: "Settings", icon: IconSettings },
];
const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: IconHome },
  { href: "/admin/users", label: "Users", icon: IconUsers, matchPrefix: true },
  { href: "/admin/quizzes", label: "Quizzes", icon: IconClipboard, matchPrefix: true },
  { href: "/admin/sessions", label: "Sessions", icon: IconPlay, matchPrefix: true },
  { href: "/admin/violations", label: "Violations", icon: IconShield, matchPrefix: true },
  { href: "/admin/patch-notes", label: "Patch Notes", icon: IconMegaphone, matchPrefix: true },
];
const studentNav: NavItem[] = [
  { href: "/student", label: "Dashboard", icon: IconHome, matchPrefix: true },
  { href: "/student/join", label: "Join a Quiz", icon: IconTarget },
  { href: "/guide", label: "Guide", icon: IconBook },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

const ROLE_META: Record<string, { label: string; color: string; darkColor: string }> = {
  SUPER_ADMIN: { label: "Super Admin", color: "bg-danger/10 text-danger", darkColor: "bg-red-500/20 text-red-400" },
  TEACHER: { label: "Teacher", color: "bg-primary/10 text-primary", darkColor: "bg-blue-500/20 text-blue-400" },
  STUDENT: { label: "Student", color: "bg-success/10 text-success", darkColor: "bg-emerald-500/20 text-emerald-400" },
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [patchNote, setPatchNote] = useState<{ id: string; title: string; body: string } | null>(null);
  const hasFetchedPatchNote = useRef(false);
  const role = session?.user?.role;
  const navItems =
    role === "SUPER_ADMIN" ? adminNav : role === "TEACHER" ? teacherNav : studentNav;
  const roleMeta = role ? ROLE_META[role] : null;
  const homeHref = role === "SUPER_ADMIN" ? "/admin" : role === "TEACHER" ? "/teacher" : "/student";
  const pageTitle = navItems.find(({ href, matchPrefix }) =>
    pathname === href || (!!matchPrefix && pathname.startsWith(href + "/"))
  )?.label;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!session?.user || hasFetchedPatchNote.current) return;
    hasFetchedPatchNote.current = true;
    fetch("/api/patch-notes/active")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.note && !data.hasRead) {
          setPatchNote(data.note);
        }
      })
      .catch(() => {});
  }, [session?.user]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] lg:flex">

      {/* ── Mobile top bar ── */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href={homeHref} className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}
            >
              <span className="text-white font-black text-sm">Q</span>
            </div>
            <div>
              <span className="block text-sm font-extrabold text-white tracking-tight">QuizPH</span>
              {pageTitle && (
                <span className="block text-[10px] font-medium text-slate-400">
                  {pageTitle}
                </span>
              )}
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/80 text-slate-300 transition hover:border-slate-600 hover:text-white"
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
          >
            {mobileNavOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </header>

      {/* ── Mobile overlay ── */}
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-[3px] lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[86vw] max-w-[320px] flex-col border-r border-slate-800 bg-slate-950 shadow-2xl transition-transform duration-300 lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          "lg:flex"
        )}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5">
          <Link href={homeHref} className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}
            >
              <span className="text-white font-black text-sm">Q</span>
            </div>
            <div>
              <span className="block text-base font-extrabold text-white tracking-tight">QuizPH</span>
              <span className="block text-[10px] font-medium text-slate-500 leading-tight">Quiz sessions for focus</span>
            </div>
          </Link>
        </div>

        {/* Divider */}
        <div className="mx-4 mb-2 h-px bg-slate-800/60" />

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, matchPrefix }) => {
            const isActive = pathname === href || (!!matchPrefix && pathname.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary text-white shadow-[0_2px_10px_rgba(37,99,235,0.45)] ring-1 ring-blue-400/20"
                    : "text-slate-400 hover:bg-white/6 hover:text-slate-100"
                )}
              >
                <span className={cn("flex-shrink-0 transition-transform duration-150", !isActive && "group-hover:scale-105")}>
                  <Icon />
                </span>
                <span>{label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="mx-4 mb-4 mt-2">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-3">
            <div className="flex items-center gap-2.5 min-w-0 mb-2.5">
              {session?.user?.avatar ? (
                <img
                  src={getAvatarUrl(session.user.avatar)}
                  alt="avatar"
                  className="w-8 h-8 rounded-full flex-shrink-0 bg-slate-800 ring-2 ring-slate-700/80"
                />
              ) : (
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
                    getAvatarColor(session?.user?.name)
                  )}
                >
                  {getInitials(session?.user?.name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {session?.user?.name}
                </p>
                {roleMeta && (
                  <p className={cn("text-[10px] font-semibold truncate", roleMeta.darkColor.replace("bg-", "text-").split(" ")[1] || "text-slate-400")}>
                    {roleMeta.label}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/8 py-1.5 rounded-lg transition-all"
            >
              <IconLogOut />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="min-h-screen flex-1 overflow-auto lg:ml-64">
        {/* Desktop top bar */}
        <div className="sticky top-0 z-20 hidden lg:flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-border/60 px-8 h-[54px]">
          <div className="flex items-center gap-3">
            {pageTitle ? (
              <h2 className="text-sm font-semibold text-foreground">{pageTitle}</h2>
            ) : (
              <span className="text-sm font-semibold text-muted">Dashboard</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2.5">
              {session?.user?.avatar ? (
                <img
                  src={getAvatarUrl(session.user.avatar)}
                  alt="avatar"
                  className="w-7 h-7 rounded-full bg-surface ring-2 ring-border/60"
                />
              ) : (
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0", getAvatarColor(session?.user?.name))}>
                  {getInitials(session?.user?.name)}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-foreground leading-tight">{session?.user?.name}</p>
                {roleMeta && (
                  <p className={cn("text-[10px] font-semibold", roleMeta.color.split(" ").find(c => c.startsWith("text-")) || "text-muted")}>{roleMeta.label}</p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 pb-6 pt-5 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">{children}</div>
      </main>

      {patchNote && (
        <PatchNoteModal
          noteId={patchNote.id}
          title={patchNote.title}
          body={patchNote.body}
          onDismiss={() => setPatchNote(null)}
        />
      )}
    </div>
  );
}
