import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Same photograph used on the sign-in page, kept for brand continuity.
export const HERO_PHOTO =
  "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=1600&q=80";

export const buttonPrimary =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark";
export const buttonSecondary =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface";
export const buttonOnPhoto =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#fff] px-3.5 text-sm font-semibold text-[#0B1A2C] shadow-sm transition hover:bg-[#EEF2F7]";
export const buttonGhostOnPhoto =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20";

export function HeroBanner({
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={cn("relative overflow-hidden rounded-xl border border-border shadow-sm", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={HERO_PHOTO} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/85 to-ink/50" />
      <div className="relative flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="min-w-0">
          {eyebrow && <p suppressHydrationWarning className="text-xs font-medium uppercase tracking-[0.14em] text-white/60">{eyebrow}</p>}
          <h1 suppressHydrationWarning className="mt-1.5 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">{title}</h1>
          {description && <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/70">{description}</p>}
        </div>
        {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export type Tone = "primary" | "success" | "warning" | "danger" | "secondary" | "accent" | "neutral";

const TONE_TILE: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  secondary: "bg-secondary/10 text-secondary",
  accent: "bg-accent/10 text-accent",
  neutral: "bg-surface text-muted",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  spark,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  spark?: ReactNode;
}) {
  return (
    <div className="flex items-stretch justify-between gap-3 rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex min-w-0 flex-col justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-2 text-[1.65rem] font-semibold leading-none tabular-nums tracking-tight text-foreground">{value}</p>
        {hint && <p className="mt-2 text-xs leading-snug text-muted">{hint}</p>}
      </div>
      <div className="flex flex-shrink-0 flex-col items-end justify-between gap-2">
        {icon && <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", TONE_TILE[tone])}>{icon}</span>}
        {spark}
      </div>
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex min-h-0 flex-col rounded-xl border border-border bg-white shadow-sm", className)}>
      <header className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </header>
      <div className={cn("min-h-0 flex-1 px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" className="inline-flex rounded-lg border border-border bg-surface p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition",
              active ? "bg-white text-foreground shadow-sm" : "text-muted hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

const PILL_TONE: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  secondary: "bg-secondary/10 text-secondary",
  accent: "bg-accent/10 text-accent",
  neutral: "bg-surface text-muted border border-border",
};

export function StatusPill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium", PILL_TONE[tone])}>
      {children}
    </span>
  );
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconQuiz = () => (
  <svg {...iconProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg>
);
export const IconQuestion = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
);
export const IconPlay = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
);
export const IconClock = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
export const IconUsers = () => (
  <svg {...iconProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
export const IconClipboard = () => (
  <svg {...iconProps}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
);
export const IconPulse = () => (
  <svg {...iconProps}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
);
export const IconTarget = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
);
export const IconShieldAlert = () => (
  <svg {...iconProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
);
export const IconPlus = () => (
  <svg {...iconProps} width={14} height={14} strokeWidth={2.25}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
export const IconChevronRight = () => (
  <svg {...iconProps} width={14} height={14}><polyline points="9 18 15 12 9 6" /></svg>
);
