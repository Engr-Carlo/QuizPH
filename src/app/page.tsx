import Link from "next/link";

const MOCK_STUDENTS = [
  { i: "JD", name: "Juan P. dela Cruz",  score: 7,  total: 10, pct: 70,  color: "bg-blue-500",     done: false, flag: false },
  { i: "MS", name: "Maria Santos",        score: 10, total: 10, pct: 100, color: "bg-emerald-500",  done: true,  flag: false },
  { i: "PR", name: "Pedro Reyes",         score: 3,  total: 10, pct: 30,  color: "bg-amber-500",   done: false, flag: true  },
  { i: "AV", name: "Ana L. Villalobos",  score: 6,  total: 10, pct: 60,  color: "bg-violet-500",  done: false, flag: false },
  { i: "CB", name: "Carlo Buenaventura", score: 1,  total: 10, pct: 10,  color: "bg-sky-500",     done: false, flag: false },
];

function ProductMockup() {
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl text-xs font-mono select-none">
      {/* Window bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-800 border-b border-white/8">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-3 text-slate-400 text-[11px]">Live Monitor — Science Quiz #2</span>
        <span className="ml-auto flex items-center gap-1 text-emerald-400 text-[11px]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </span>
      </div>
      {/* Header row */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-4 py-2 text-slate-500 border-b border-white/6 text-[10px] uppercase tracking-wide">
        <span>Student</span><span className="text-center">Answered</span><span className="text-center">Score</span><span className="text-center">Flag</span>
      </div>
      {/* Rows */}
      {MOCK_STUDENTS.map(({ i, name, score, total, pct, color, done, flag }) => (
        <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 items-center px-4 py-2.5 border-b border-white/5 last:border-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-6 h-6 rounded-full ${color} flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0`}>{i}</span>
            <span className="text-slate-300 truncate text-[11px]">{name}</span>
          </div>
          <div className="text-center">
            {done
              ? <span className="text-emerald-400 text-[11px] font-semibold">Done</span>
              : <div className="mx-auto w-14 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} /></div>}
          </div>
          <div className="text-center text-slate-300 text-[11px]">{score}/{total}</div>
          <div className="text-center">
            {flag
              ? <span className="text-amber-400 text-[11px]">Tab switch</span>
              : <span className="text-slate-600 text-[11px]">—</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}
function FeatureMonitor() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <polyline points="7 13 10 9 13 11 17 7" />
    </svg>
  );
}
function FeatureBuilder() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  );
}
function FeatureJoin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
function FeatureResults() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function FeatureUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const FEATURES = [
  {
    title: "Anti-Cheat Engine",
    desc: "Fullscreen enforcement, tab-switch detection, copy-paste blocking, right-click prevention, and DevTools detection — all logged in real time.",
    Icon: FeatureShield,
  },
  {
    title: "Live Monitoring Dashboard",
    desc: "Watch students answer in real time. See violation alerts, individual student progress, and a live leaderboard that updates instantly.",
    Icon: FeatureMonitor,
  },
  {
    title: "Smart Quiz Builder",
    desc: "Create Multiple Choice, True/False, and Short Answer questions with per-quiz or per-question timers and answer randomization.",
    Icon: FeatureBuilder,
  },
  {
    title: "Simple Join Flow",
    desc: "Students join with a 6-character code — no app installation required. The quiz launches automatically in fullscreen mode.",
    Icon: FeatureJoin,
  },
  {
    title: "Detailed Results",
    desc: "Students see a full breakdown after finishing — every question with what they got right, wrong, and the correct answer.",
    Icon: FeatureResults,
  },
  {
    title: "User Management",
    desc: "Administrators can create, activate, and deactivate teacher and student accounts from a central dashboard.",
    Icon: FeatureUsers,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--primary)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <polyline points="9 13 11 15 15 11" />
              </svg>
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">QuizPH</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground rounded-lg transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="py-16 px-6 bg-white lg:py-24">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-semibold px-3.5 py-1.5 rounded-full mb-7 border border-primary/15 uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              Built for Philippine Educators
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-5 tracking-tight">
              Online Quizzes with<br />
              <span className="gradient-text">Real-Time Anti-Cheat</span>
            </h1>
            <p className="text-base text-muted max-w-lg mb-8 leading-relaxed">
              Create assessments, detect cheating in real time, and watch a live leaderboard — all in one platform designed for modern classrooms.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/register"
                className="px-7 py-3 text-white font-semibold rounded-lg transition hover:opacity-90 shadow-sm text-sm text-center"
                style={{ background: "var(--primary)" }}
              >
                Create Free Account
              </Link>
              <Link
                href="/login"
                className="px-7 py-3 border border-border text-foreground font-semibold rounded-lg hover:border-primary/40 hover:text-primary transition bg-white text-sm text-center"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Right — product mockup */}
          <div className="hidden lg:block">
            <ProductMockup />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Everything you need to run fair assessments
            </h2>
            <p className="text-muted max-w-xl mx-auto text-sm">
              From building quizzes to monitoring live sessions, QuizPH gives educators complete control.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map(({ title, desc, Icon }) => (
              <div
                key={title}
                className="rounded-xl p-6 border border-border hover:border-primary/30 hover:shadow-sm transition-all duration-200 bg-white"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/8 text-primary flex items-center justify-center mb-4">
                  <Icon />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-muted text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-surface border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-3">How it works</h2>
            <p className="text-muted text-sm">Get your first quiz running in minutes.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              { step: "1", title: "Create a Quiz", desc: "Build your quiz with multiple question types, set a timer, and configure anti-cheat options." },
              { step: "2", title: "Share the Code", desc: "Start a session and share the 6-character join code with your students. No installation needed." },
              { step: "3", title: "Monitor Live", desc: "Watch real-time results, violation alerts, and a live leaderboard as students answer." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5"
                  style={{ background: "var(--primary)" }}
                >
                  {step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">{title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial / photo section */}
      <section className="relative overflow-hidden py-20 px-6">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80"
          alt="Students collaborating on laptops in class"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/70" />
        <div className="relative max-w-3xl mx-auto text-center text-white">
          <p className="text-2xl font-bold leading-snug mb-6">
            &ldquo;Finally a quiz platform that actually catches cheating — not just blocks one trick.&rdquo;
          </p>
          <p className="text-white/65 text-sm">— Filipino educator, Grades 7 &amp; 8 Science</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center" style={{ background: "var(--primary)" }}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to get started?</h2>
          <p className="text-white/75 text-sm mb-8">
            Sign up and run your first quiz today. It is completely free.
          </p>
          <Link
            href="/register"
            className="inline-block px-7 py-3 bg-white font-semibold rounded-lg hover:bg-gray-50 transition text-sm"
            style={{ color: "var(--primary)" }}
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-border bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="font-semibold text-sm text-foreground">QuizPH</span>
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} QuizPH. Built for Philippine educators.
          </p>
        </div>
      </footer>
    </div>
  );
}
