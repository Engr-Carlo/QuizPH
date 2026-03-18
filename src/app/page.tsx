import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* â”€â”€ Navigation â”€â”€ */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
            >
              <span className="text-white font-black text-[13px]">Q</span>
            </div>
            <span className="text-xl font-extrabold text-foreground tracking-tight">QuizPH</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground rounded-lg hover:bg-surface transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
            >
              Get Started â†’
            </Link>
          </div>
        </nav>
      </header>

      {/* â”€â”€ Hero â”€â”€ */}
      <section className="relative flex flex-col items-center justify-center py-28 px-6 overflow-hidden bg-white">
        {/* Blur orbs */}
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.07] blur-3xl pointer-events-none"
          style={{ background: "var(--primary)" }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full opacity-[0.06] blur-3xl pointer-events-none"
          style={{ background: "var(--secondary)" }}
        />

        <div className="relative max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-7 border border-primary/15 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot inline-block" />
            Built for Philippine Educators
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-foreground leading-[1.1] mb-6 tracking-tight">
            Smarter Quizzes with<br />
            <span className="gradient-text">Real-Time Anti-Cheat</span>
          </h1>

          <p className="text-lg text-muted mb-10 max-w-2xl mx-auto leading-relaxed">
            Create engaging assessments, detect cheating in real-time, and see live leaderboards â€” all in one platform designed for modern Philippine classrooms.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="px-8 py-3.5 text-white font-semibold rounded-xl transition hover:opacity-90 text-base shadow-lg"
              style={{
                background: "linear-gradient(135deg, var(--primary), var(--primary-dark))",
                boxShadow: "0 8px 24px rgba(108,92,231,0.3)",
              }}
            >
              Start for Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 border-2 border-border text-foreground font-semibold rounded-xl hover:border-primary/50 hover:text-primary transition text-base bg-white"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative mt-20 grid grid-cols-3 gap-8 max-w-2xl w-full text-center">
          {[
            { value: "Anti-Cheat", sub: "5-layer protection system", color: "text-primary" },
            { value: "Real-Time", sub: "Live leaderboard & alerts", color: "text-secondary" },
            { value: "Instant", sub: "Auto-graded with breakdowns", color: "text-accent" },
          ].map(({ value, sub, color }) => (
            <div key={value}>
              <div className={`text-2xl font-extrabold ${color} mb-1`}>{value}</div>
              <div className="text-xs text-muted">{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* â”€â”€ Features â”€â”€ */}
      <section className="py-24 px-6 bg-surface">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-foreground mb-4">
              Everything you need to run fair assessments
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              From building quizzes to monitoring live sessions, QuizPH gives teachers complete control.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map(({ icon, title, desc, accent }) => (
              <div
                key={title}
                className="bg-card rounded-2xl p-7 border border-border card-hover"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5"
                  style={{ background: `${accent}14` }}
                >
                  {icon}
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
                <p className="text-muted text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ How it works â”€â”€ */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-foreground mb-4">How it works</h2>
          <p className="text-muted text-lg mb-14">Get your first quiz running in under 5 minutes.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create a Quiz", desc: "Build your quiz with multiple question types, set a timer, and configure anti-cheat options." },
              { step: "02", title: "Share the Code", desc: "Start a session and share the 6-character join code with your students. No app install needed." },
              { step: "03", title: "Monitor Live", desc: "Watch real-time results, violation alerts, and a live leaderboard as students answer questions." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative text-left">
                <div
                  className="text-5xl font-black mb-4 opacity-10"
                  style={{ color: "var(--primary)" }}
                >
                  {step}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
                <p className="text-muted text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ CTA banner â”€â”€ */}
      <section
        className="py-20 px-6 text-white text-center"
        style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
      >
        <h2 className="text-3xl font-extrabold mb-4">Ready to get started?</h2>
        <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
          Join educators using QuizPH to run better, fairer, more engaging assessments.
        </p>
        <Link
          href="/register"
          className="inline-block px-8 py-3.5 bg-white font-semibold rounded-xl hover:bg-gray-50 transition text-base shadow-lg"
          style={{ color: "var(--primary)" }}
        >
          Create Free Account â†’
        </Link>
      </section>

      {/* â”€â”€ Footer â”€â”€ */}
      <footer className="py-8 px-6 border-t border-border bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
            >
              <span className="text-white font-black text-[10px]">Q</span>
            </div>
            <span className="font-bold text-sm text-foreground">QuizPH</span>
          </div>
          <p className="text-xs text-muted">
            Â© {new Date().getFullYear()} QuizPH. Built for Philippine educators.
          </p>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: "ðŸ›¡ï¸",
    title: "Anti-Cheat Engine",
    desc: "Fullscreen enforcement, tab-switch detection, copy-paste blocking, right-click prevention, and DevTools detection â€” all logged in real-time.",
    accent: "#6c5ce7",
  },
  {
    icon: "ðŸ“Š",
    title: "Live Monitoring Dashboard",
    desc: "Watch students answer in real-time. See violation alerts, student progress, and a live leaderboard that updates instantly.",
    accent: "#00cec9",
  },
  {
    icon: "âš¡",
    title: "Smart Quiz Builder",
    desc: "Create MCQ, True/False, and Short Answer questions with per-quiz or per-question timers and answer randomization.",
    accent: "#fd79a8",
  },
  {
    icon: "ðŸŽ¯",
    title: "Simple Join Flow",
    desc: "Students join with a 6-character code â€” no app install. The quiz launches automatically in fullscreen mode.",
    accent: "#f39c12",
  },
  {
    icon: "ðŸ“ˆ",
    title: "Detailed Results",
    desc: "Students see a full breakdown after finishing â€” every question showing what they got right, wrong, and the correct answer.",
    accent: "#00b894",
  },
  {
    icon: "ðŸ‘¥",
    title: "User Management",
    desc: "Admins can create, activate, and deactivate teacher and student accounts from a central dashboard.",
    accent: "#0984e3",
  },
];
