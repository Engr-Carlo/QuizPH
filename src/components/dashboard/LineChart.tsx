"use client";

import { useId } from "react";

export interface ChartSeries {
  name: string;
  color: string;
  values: number[];
}

interface LineChartProps {
  labels: string[];
  series: ChartSeries[];
  integer?: boolean;
  formatValue?: (value: number) => string;
  emptyMessage?: string;
}

const PLOT_TOP = 6;
const PLOT_SPAN = 88;

const yPct = (value: number, max: number) => PLOT_TOP + (1 - value / max) * PLOT_SPAN;
const xPct = (index: number, count: number) => (count <= 1 ? 50 : 4 + (index / (count - 1)) * 92);

function niceScale(maxValue: number, integer: boolean) {
  const base = Math.max(maxValue, integer ? 4 : 1);
  const raw = base / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const fraction = raw / magnitude;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * magnitude;
  return { step, max: step * 4 };
}

const defaultFormat = (value: number) => String(Number(value.toFixed(2)));

export default function LineChart({ labels, series, integer = true, formatValue, emptyMessage }: LineChartProps) {
  const gradientId = `area-${useId().replace(/:/g, "")}`;
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
  const showArea = series.length === 1;

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

        <div className="absolute inset-y-0 left-10 right-0">
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={series[0]?.color} stopOpacity="0.16" />
                <stop offset="100%" stopColor={series[0]?.color} stopOpacity="0" />
              </linearGradient>
            </defs>

            {ticks.map((tick) => (
              <line
                key={tick}
                x1="0"
                x2="100"
                y1={yPct(tick, max)}
                y2={yPct(tick, max)}
                strokeWidth="1"
                strokeDasharray={tick === 0 ? undefined : "3 4"}
                vectorEffect="non-scaling-stroke"
                style={{ stroke: "var(--border)" }}
              />
            ))}

            {showArea && count > 1 && (
              <polygon
                fill={`url(#${gradientId})`}
                points={[
                  `${xPct(0, count)},${yPct(0, max)}`,
                  ...series[0].values.map((v, i) => `${xPct(i, count)},${yPct(v, max)}`),
                  `${xPct(count - 1, count)},${yPct(0, max)}`,
                ].join(" ")}
              />
            )}

            {count > 1 &&
              series.map((s) => (
                <polyline
                  key={s.name}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  points={s.values.map((v, i) => `${xPct(i, count)},${yPct(v, max)}`).join(" ")}
                />
              ))}
          </svg>

          {series.map((s) =>
            s.values.map((v, i) => (
              <span
                key={`${s.name}-${i}`}
                title={`${labels[i]} · ${s.name}: ${format(v)}`}
                className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white"
                style={{ left: `${xPct(i, count)}%`, top: `${yPct(v, max)}%`, borderColor: s.color }}
              />
            ))
          )}
        </div>
      </div>

      <div className="relative ml-10 mt-2 h-4">
        {labels.map((label, i) => (
          <span
            key={`${label}-${i}`}
            title={label}
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11px] text-muted"
            style={{ left: `${xPct(i, count)}%` }}
          >
            {label.length > 12 ? `${label.slice(0, 11)}…` : label}
          </span>
        ))}
      </div>
    </div>
  );
}
