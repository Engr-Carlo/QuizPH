"use client";

import { useId, useState } from "react";

export interface ChartSeries {
  name: string;
  color: string;
  values: number[];
}

const PLOT_TOP = 8;
const PLOT_SPAN = 84;

const yPct = (value: number, max: number) => PLOT_TOP + (1 - value / max) * PLOT_SPAN;
const xPct = (index: number, count: number) => (count <= 1 ? 50 : 3 + (index / (count - 1)) * 94);

function niceScale(maxValue: number, integer: boolean) {
  const base = Math.max(maxValue, integer ? 4 : 1);
  const raw = base / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const fraction = raw / magnitude;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * magnitude;
  return { step, max: step * 4 };
}

// Horizontal-tangent bezier: smooth without overshooting the data.
function smoothPath(points: [number, number][]) {
  if (points.length === 0) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const mx = (x0 + x1) / 2;
    d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  return d;
}

const defaultFormat = (value: number) => String(Number(value.toFixed(2)));

interface AreaChartProps {
  labels: string[];
  series: ChartSeries[];
  integer?: boolean;
  formatValue?: (value: number) => string;
  emptyMessage?: string;
}

export function AreaChart({ labels, series, integer = true, formatValue, emptyMessage }: AreaChartProps) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const count = labels.length;
  const format = formatValue ?? defaultFormat;

  if (count === 0) {
    return (
      <div className="flex h-full min-h-[140px] items-center justify-center text-sm text-muted">
        {emptyMessage ?? "No data to display"}
      </div>
    );
  }

  const peak = Math.max(...series.flatMap((s) => s.values), 0);
  const { step, max } = niceScale(peak, integer);
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);
  const baseY = yPct(0, max);
  const labelEvery = Math.max(1, Math.ceil(count / 7));

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointer = ((event.clientX - rect.left) / rect.width) * 100;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < count; i++) {
      const distance = Math.abs(xPct(i, count) - pointer);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    }
    setHover(nearest);
  }

  const hoverX = hover === null ? 0 : xPct(hover, count);

  return (
    <div className="flex h-full min-h-[160px] flex-col">
      <div className="relative flex-1">
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute left-0 w-9 -translate-y-1/2 pr-2 text-right text-[11px] tabular-nums text-muted"
            style={{ top: `${yPct(tick, max)}%` }}
          >
            {format(tick)}
          </span>
        ))}

        <div
          className="absolute inset-y-0 left-10 right-0 touch-none"
          onPointerMove={handleMove}
          onPointerDown={handleMove}
          onPointerLeave={() => setHover(null)}
        >
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              {series.map((s, index) => (
                <linearGradient key={s.name} id={`${uid}-${index}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={series.length > 1 ? 0.14 : 0.22} />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>

            {ticks.map((tick) => (
              <line
                key={tick}
                x1="0"
                x2="100"
                y1={yPct(tick, max)}
                y2={yPct(tick, max)}
                strokeWidth="1"
                strokeDasharray={tick === 0 ? undefined : "2 4"}
                vectorEffect="non-scaling-stroke"
                style={{ stroke: "var(--border)" }}
              />
            ))}

            {count > 1 &&
              series.map((s, index) => {
                const points = s.values.map((v, i) => [xPct(i, count), yPct(v, max)] as [number, number]);
                const line = smoothPath(points);
                return (
                  <g key={s.name}>
                    <path
                      d={`${line} L${points[points.length - 1][0]},${baseY} L${points[0][0]},${baseY} Z`}
                      fill={`url(#${uid}-${index})`}
                    />
                    <path
                      d={line}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}
          </svg>

          {hover !== null && (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 border-l border-dashed border-muted/50"
                style={{ left: `${hoverX}%` }}
              />
              {series.map((s) => (
                <span
                  key={s.name}
                  className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white"
                  style={{ left: `${hoverX}%`, top: `${yPct(s.values[hover] ?? 0, max)}%`, borderColor: s.color }}
                />
              ))}
              <div
                className="pointer-events-none absolute top-0 z-10 min-w-[120px] rounded-lg border border-border bg-white px-3 py-2 shadow-lg"
                style={{
                  left: `${hoverX}%`,
                  transform: hoverX > 60 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
                }}
              >
                <p className="text-[11px] font-medium text-muted">{labels[hover]}</p>
                {series.map((s) => (
                  <p key={s.name} className="mt-1 flex items-center justify-between gap-4 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">{format(s.values[hover] ?? 0)}</span>
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative ml-10 mt-2 h-4">
        {labels.map((label, i) =>
          i % labelEvery === 0 ? (
            <span
              key={`${label}-${i}`}
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11px] text-muted"
              style={{ left: `${xPct(i, count)}%` }}
            >
              {label}
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}

export function Sparkline({ values, color, className }: { values: number[]; color: string; className?: string }) {
  const uid = useId().replace(/:/g, "");
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const points = values.map((v, i) => [(i / (values.length - 1)) * 100, 30 - (v / max) * 26] as [number, number]);
  const line = smoothPath(points);

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={className ?? "h-9 w-24"} aria-hidden="true">
      <defs>
        <linearGradient id={uid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L100,32 L0,32 Z`} fill={`url(#${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export interface BarItem {
  label: string;
  value: number;
  hint?: string;
  color?: string;
  /** Scale this bar against its own total instead of the largest item. */
  total?: number;
}

export function HBarChart({
  items,
  formatValue,
  color = "var(--primary)",
}: {
  items: BarItem[];
  formatValue?: (value: number) => string;
  color?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const format = formatValue ?? defaultFormat;

  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-medium text-foreground">{item.label}</span>
            <span className="flex-shrink-0 tabular-nums text-muted">
              <span className="font-semibold text-foreground">{format(item.value)}</span>
              {item.hint && <span className="ml-1.5">{item.hint}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border/60">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((item.total !== undefined ? (item.total > 0 ? item.value / item.total : 0) : item.value / max) * 100, item.value > 0 ? 3 : 0)}%`,
                background: item.color ?? color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface DonutItem {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  items,
  centerValue,
  centerLabel,
  size = 132,
  emptyMessage = "No data yet",
}: {
  items: DonutItem[];
  centerValue?: string | number;
  centerLabel?: string;
  size?: number;
  emptyMessage?: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const gap = items.filter((i) => i.value > 0).length > 1 ? 2.2 : 0;
  let offset = 0;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={centerLabel ?? "Distribution chart"}>
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="11" style={{ stroke: "var(--border)" }} />
        {total > 0 &&
          items.map((item) => {
            if (item.value <= 0) return null;
            const length = (item.value / total) * circumference;
            const segment = (
              <circle
                key={item.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth="11"
                stroke={item.color}
                strokeDasharray={`${Math.max(length - gap, 0.5)} ${circumference - Math.max(length - gap, 0.5)}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return segment;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {total === 0 ? (
          <span className="px-4 text-[11px] leading-tight text-muted">{emptyMessage}</span>
        ) : (
          <>
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{centerValue ?? total}</span>
            {centerLabel && <span className="text-[11px] text-muted">{centerLabel}</span>}
          </>
        )}
      </div>
    </div>
  );
}

export function DonutLegend({ items }: { items: DonutItem[] }) {
  return (
    <ul className="min-w-0 flex-1 space-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center justify-between gap-3 text-xs">
          <span className="inline-flex min-w-0 items-center gap-2 text-muted">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: item.color }} />
            <span className="truncate">{item.label}</span>
          </span>
          <span className="font-semibold tabular-nums text-foreground">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
