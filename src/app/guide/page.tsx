"use client";

import DashboardLayout from "@/components/DashboardLayout";

const TEACHER_STEPS = [
  {
    step: "01",
    title: "Create a Quiz",
    desc: `Go to "My Quizzes" and click "Create Quiz". Enter a title, set the timer (minutes and seconds), choose how questions are selected (all, random draw, or manual), and enable anti-cheat if needed.`,
  },
  {
    step: "02",
    title: "Add Questions",
    desc: "Inside the quiz editor, add Multiple Choice, True/False, or Short Answer questions. Organise them by topic. Mark the correct answer for automatic scoring.",
  },
  {
    step: "03",
    title: "Start a Session",
    desc: `Open the quiz, scroll to Sessions, and click "New Session". Share the 6-character code with your students. When everyone is ready, click "Start Session".`,
  },
  {
    step: "04",
    title: "Monitor Live",
    desc: `Click "Monitor Live" on any active session to see who has joined, their progress, and any anti-cheat violations in real time.`,
  },
  {
    step: "05",
    title: "Review Results",
    desc: `After ending a session, click "View Results" to see each student's score, per-question accuracy, and a full violation log.`,
  },
];

const STUDENT_STEPS = [
  {
    step: "01",
    title: "Get the Session Code",
    desc: "Your teacher will share a 6-character code at the start of class. Have it ready before entering the join screen.",
  },
  {
    step: "02",
    title: "Join the Quiz",
    desc: `Go to "Join a Quiz", type or paste the code into the boxes, and tap "Join Quiz". Read the Academic Integrity Notice and tap "I Understand" to proceed.`,
  },
  {
    step: "03",
    title: "Wait for the Teacher to Start",
    desc: "You will land on a waiting screen. The quiz launches automatically the moment your teacher starts the session — no refresh needed.",
  },
  {
    step: "04",
    title: "Answer Questions",
    desc: "Tap an option to answer MCQ / True-False questions. Type into the text box for Short Answer questions. Use the question rail on the right to jump between items.",
  },
  {
    step: "05",
    title: "Navigate and Submit",
    desc: `Use the Prev / Next buttons at the bottom. When you reach the last question, a "Submit" button appears. The quiz also auto-submits when the timer hits zero.`,
  },
  {
    step: "06",
    title: "Rejoining After a Disconnect",
    desc: "If you close the browser and rejoin with the same code, you will be placed back on the question you were last on and the timer will resume from wherever it left off.",
  },
];

const ANTI_CHEAT_RULES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    title: "Fullscreen enforced",
    desc: "Exiting fullscreen is immediately logged and reported to your teacher.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
    title: "Tab switching detected",
    desc: "Switching apps or tabs triggers a violation alert on the teacher's monitor screen.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>
      </svg>
    ),
    title: "Copy & paste disabled",
    desc: "Copy, cut, and paste are blocked during an active quiz to prevent sharing answers.",
  },
];

const FAQ = [
  {
    q: "Can I pause the timer?",
    a: "No. The timer runs server-side and cannot be paused. If you disconnect and reconnect, the timer resumes from where it was — it does not reset.",
  },
  {
    q: "What happens if I run out of time?",
    a: "The quiz auto-submits with whatever answers you had at that point. Make sure to answer higher-priority questions first.",
  },
  {
    q: "Are violations automatic disqualifications?",
    a: "No. Violations are recorded and shown to your teacher. It is up to the teacher to decide any consequence.",
  },
  {
    q: "Can I go back to a previous question?",
    a: "Yes. Use the Prev button or tap any number in the question rail. Your answer for the current question is saved before jumping.",
  },
  {
    q: "How are Short Answer questions graded?",
    a: "Short Answer responses are compared against the teacher's model answer using case-insensitive exact matching. Minor spelling differences may not match — answer precisely.",
  },
  {
    q: "Where do I see my score?",
    a: "Your score is shown immediately on the completion screen after the quiz ends. A detailed breakdown is available in your quiz history.",
  },
];

export default function GuidePage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-8 pb-12">
        {/* Hero */}
        <div className="rounded-[28px] bg-primary px-6 py-8 text-white shadow-sm sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">Documentation</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">QuizPH Guide</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 sm:text-base">
            Everything you need to know — whether you&apos;re a teacher setting up an assessment or a student joining your first quiz.
          </p>
        </div>

        {/* Teacher Steps */}
        <section>
          <h2 className="mb-4 text-lg font-black text-foreground">For Teachers</h2>
          <div className="space-y-3">
            {TEACHER_STEPS.map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 rounded-[20px] border border-border/70 bg-white p-4 sm:p-5">
                <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-black text-primary">
                  {step}
                </span>
                <div>
                  <p className="font-bold text-foreground">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Student Steps */}
        <section>
          <h2 className="mb-4 text-lg font-black text-foreground">For Students</h2>
          <div className="space-y-3">
            {STUDENT_STEPS.map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 rounded-[20px] border border-border/70 bg-white p-4 sm:p-5">
                <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-success/10 text-sm font-black text-success">
                  {step}
                </span>
                <div>
                  <p className="font-bold text-foreground">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Anti-cheat */}
        <section>
          <h2 className="mb-1 text-lg font-black text-foreground">Anti-Cheat System</h2>
          <p className="mb-4 text-sm text-muted">Enabled per quiz by the teacher. All violations are logged and visible to the teacher in real time.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {ANTI_CHEAT_RULES.map(({ icon, title, desc }) => (
              <div key={title} className="rounded-[20px] border border-border/70 bg-white p-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</span>
                <p className="mt-2 font-bold text-foreground">{title}</p>
                <p className="mt-1 text-sm leading-5 text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="mb-4 text-lg font-black text-foreground">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="rounded-[20px] border border-border/70 bg-white p-4 sm:p-5">
                <p className="font-bold text-foreground">{q}</p>
                <p className="mt-1.5 text-sm leading-6 text-muted">{a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
