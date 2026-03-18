import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">QuizPH</h1>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl">
          <h2 className="text-5xl font-extrabold mb-4">
            Smart Quizzes with{" "}
            <span className="text-primary">Anti-Cheat</span> Monitoring
          </h2>
          <p className="text-lg text-muted mb-8">
            Create engaging quizzes, monitor students in real-time, and ensure academic
            integrity with fullscreen enforcement, tab-switch detection, and live
            violation tracking.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition text-lg"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary/10 transition text-lg"
            >
              Log In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-4xl w-full">
          <div className="bg-card border border-border rounded-xl p-6 text-left">
            <div className="text-3xl mb-3">🛡️</div>
            <h3 className="font-bold text-lg mb-2">Anti-Cheat Engine</h3>
            <p className="text-muted text-sm">
              Fullscreen enforcement, tab-switch detection, copy-paste blocking,
              and DevTools detection.
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 text-left">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-bold text-lg mb-2">Live Monitoring</h3>
            <p className="text-muted text-sm">
              Real-time dashboard shows violation alerts, student progress, and
              live leaderboards as quizzes happen.
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 text-left">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-bold text-lg mb-2">Easy Quiz Builder</h3>
            <p className="text-muted text-sm">
              Create MCQ, True/False, and Short Answer questions with timers,
              randomization, and instant scoring.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        QuizPH &copy; {new Date().getFullYear()}. Built for Philippine educators.
      </footer>
    </div>
  );
}
