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
      <div className="max-w-2xl">
        {/* Welcome banner */}
        <div
          className="rounded-2xl p-8 mb-8 text-white"
          style={{ background: "linear-gradient(135deg, var(--primary) 0%, #4834d4 100%)" }}
        >
          <p className="text-white/70 text-sm mb-1">Welcome back,</p>
          <h1 className="text-3xl font-extrabold mb-2">{firstName}</h1>
          <p className="text-white/80 text-sm mb-6">
            Ready to take a quiz? Enter the code your teacher gave you to get started.
          </p>
          <Link
            href="/student/join"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white font-bold rounded-xl text-base shadow-md transition hover:bg-gray-50"
            style={{ color: "var(--primary)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Join a Quiz
          </Link>
        </div>

        {/* Anti-cheat rules */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Quiz Anti-Cheat Rules
            </h2>
            <p className="text-xs text-muted mt-1">All violations are reported to your teacher in real-time.</p>
          </div>
          <div className="divide-y divide-border/50">
            {RULES.map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 px-6 py-4">
                <span className="mt-0.5 flex-shrink-0 text-primary">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
