"use client";

import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

const RULES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    title: "Fullscreen Required",
    desc: "The quiz will launch in fullscreen. Exiting will be logged.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
    title: "No Tab Switching",
    desc: "Switching to another tab or window is detected and reported.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>
      </svg>
    ),
    title: "Copy-Paste Disabled",
    desc: "Copy-paste shortcuts are blocked during the quiz.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="3" width="12" height="18" rx="6"/><line x1="12" y1="7" x2="12" y2="11"/>
      </svg>
    ),
    title: "No Right-Clicking",
    desc: "Right-click context menu is prevented throughout.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
    title: "DevTools Detection",
    desc: "Opening browser Developer Tools will be flagged.",
  },
];

export default function StudentDashboard() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] || "Student";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#1d4ed8_0%,#4f46e5_45%,#0ea5e9_100%)] px-5 py-6 text-white shadow-[0_22px_70px_rgba(37,99,235,0.28)] sm:px-7 sm:py-8">
          <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/12 blur-2xl" />
          <div className="absolute bottom-0 right-0 h-28 w-28 rounded-full bg-cyan-200/20 blur-2xl" />
          <div className="relative grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Student space</p>
              <h1 className="mt-2 max-w-xl text-3xl font-black leading-tight sm:text-4xl">
                {firstName}, you are one code away from your next challenge.
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/80 sm:text-base">
                Join quickly, stay focused on your phone, and take the quiz in a cleaner fullscreen flow.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/student/join"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-sky-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Join a Quiz
                </Link>
                <div className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white/88 backdrop-blur">
                  Mobile-first fullscreen experience
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Session code", value: "6 chars" },
                { label: "Best on", value: "Phone" },
                { label: "Anti-cheat", value: "Live" },
                { label: "Flow", value: "Focused" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/65">{label}</div>
                  <div className="mt-2 text-lg font-black">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-border/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Before you start</p>
                <h2 className="mt-1 text-xl font-black text-foreground">Keep your quiz run clean</h2>
              </div>
              <div className="rounded-2xl bg-warning/10 px-3 py-2 text-xs font-bold text-warning">
                Real-time monitoring
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {RULES.map(({ icon, title, desc }) => (
                <div key={title} className="rounded-2xl border border-border/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-sm">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {icon}
                  </span>
                  <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Fast checklist</p>
            <h2 className="mt-1 text-xl font-black text-foreground">What to expect on mobile</h2>
            <div className="mt-5 space-y-3">
              {[
                "The timer and progress stay visible while you answer.",
                "Questions stack into large tap targets for one-hand use.",
                "Navigation stays pinned near your thumb for faster movement.",
              ].map((item, index) => (
                <div key={item} className="flex gap-3 rounded-2xl bg-white/80 p-3.5 shadow-sm">
                  <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-black text-white">
                    0{index + 1}
                  </span>
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
