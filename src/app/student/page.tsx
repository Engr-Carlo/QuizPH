"use client";

import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

const RULES = [
  { icon: "🖥️", title: "Fullscreen Required", desc: "The quiz will launch in fullscreen. Exiting will be logged." },
  { icon: "🔄", title: "No Tab Switching", desc: "Switching to another tab or window is detected and reported." },
  { icon: "📋", title: "Copy-Paste Disabled", desc: "Copy-paste shortcuts are blocked during the quiz." },
  { icon: "🖱️", title: "No Right-Clicking", desc: "Right-click context menu is prevented throughout." },
  { icon: "🔧", title: "DevTools Detection", desc: "Opening browser Developer Tools will be flagged." },
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
          <h1 className="text-3xl font-extrabold mb-2">{firstName} 👋</h1>
          <p className="text-white/80 text-sm mb-6">
            Ready to take a quiz? Enter the code your teacher gave you to get started.
          </p>
          <Link
            href="/student/join"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white font-bold rounded-xl text-base shadow-md transition hover:bg-gray-50"
            style={{ color: "var(--primary)" }}
          >
            🎯 Join a Quiz
          </Link>
        </div>

        {/* Anti-cheat rules */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-base font-bold text-foreground">⚠️ Quiz Anti-Cheat Rules</h2>
            <p className="text-xs text-muted mt-1">All violations are reported to your teacher in real-time.</p>
          </div>
          <div className="divide-y divide-border/50">
            {RULES.map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 px-6 py-4">
                <span className="text-2xl mt-0.5 flex-shrink-0">{icon}</span>
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
