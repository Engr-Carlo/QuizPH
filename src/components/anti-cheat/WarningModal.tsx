"use client";

interface WarningModalProps {
  warningCount: number;
  onReenterFullscreen: () => void;
}

export default function WarningModal({
  warningCount,
  onReenterFullscreen,
}: WarningModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-card rounded-2xl p-8 max-w-md mx-4 text-center">
        <div className="w-14 h-14 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-danger mb-2">
          Warning: Cheating Detected!
        </h2>
        <p className="text-muted mb-4">
          You left fullscreen mode or switched tabs. This has been recorded and
          reported to your teacher.
        </p>
        <p className="text-sm text-danger font-medium mb-6">
          Warnings: {warningCount}
        </p>
        <button
          onClick={onReenterFullscreen}
          className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition"
        >
          Return to Fullscreen &amp; Continue
        </button>
      </div>
    </div>
  );
}
