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
        <div className="text-5xl mb-4">⚠️</div>
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
