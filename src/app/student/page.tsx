"use client";

import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

export default function StudentDashboard() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">Welcome, Student!</h1>
        <p className="text-muted mb-8">
          Enter a quiz code from your teacher to start a quiz.
        </p>

        <Link
          href="/student/join"
          className="inline-block px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-primary-dark transition"
        >
          🎯 Join a Quiz
        </Link>

        <div className="mt-12 bg-card border border-border rounded-xl p-6 text-left">
          <h3 className="font-semibold mb-3">⚠️ Anti-Cheat Rules</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>• The quiz will open in <strong>fullscreen mode</strong>. Do not exit.</li>
            <li>• <strong>Switching tabs</strong> will be detected and logged.</li>
            <li>• <strong>Copy-paste</strong> is disabled during the quiz.</li>
            <li>• <strong>Right-clicking</strong> is disabled during the quiz.</li>
            <li>• <strong>DevTools</strong> usage will be detected.</li>
            <li>• All violations are <strong>reported to your teacher in real-time</strong>.</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
