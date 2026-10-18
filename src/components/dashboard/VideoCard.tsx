type DashboardVideoCardProps = {
  title: string;
  description?: string;
};

export function DashboardVideoCard({
  title,
  description = "Watch a short tour of the product flow and the student experience.",
}: DashboardVideoCardProps) {
  return (
    <section className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-border bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Video
        </span>
      </div>

      <video
        className="w-full aspect-video rounded-xl border border-border bg-slate-950 shadow-sm"
        src="/quizph-promo.mp4"
        controls
        playsInline
        preload="metadata"
      />
    </section>
  );
}
