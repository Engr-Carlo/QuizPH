import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const PALETTES: [string, string][] = [
  ["#14305E", "#2F66B5"],
  ["#0D3A41", "#23808C"],
  ["#2E2350", "#6F55AE"],
  ["#4A3216", "#B98A3E"],
  ["#173628", "#3F8F6B"],
  ["#3A1D2A", "#A44B66"],
];

function hash(seed: string) {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  return h;
}

// Deterministic generative cover so every quiz keeps a stable visual identity without image uploads.
export function CoverArt({ seed, className, children }: { seed: string; className?: string; children?: ReactNode }) {
  const h = hash(seed);
  const [from, to] = PALETTES[h % PALETTES.length];
  const variant = (h >> 3) % 4;
  const ox = 30 + (h % 140);
  const oy = 10 + ((h >> 5) % 80);

  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {variant === 0 &&
          [16, 30, 44, 58, 72, 86].map((r, i) => (
            <circle key={r} cx={ox} cy={oy} r={r} fill="none" stroke="#fff" strokeOpacity={0.2 - i * 0.025} strokeWidth="1" />
          ))}
        {variant === 1 && (
          <>
            {Array.from({ length: 8 }).map((_, row) =>
              Array.from({ length: 15 }).map((__, col) => (
                <circle key={`${row}-${col}`} cx={8 + col * 13.5} cy={8 + row * 13} r="1.1" fill="#fff" fillOpacity="0.26" />
              ))
            )}
            <circle cx={ox} cy={oy} r="34" fill="#fff" fillOpacity="0.07" />
          </>
        )}
        {variant === 2 &&
          [22, 38, 54, 70, 86].map((y, i) => (
            <path
              key={y}
              d={`M-5,${y + (h % 7)} C45,${y - 14} 95,${y + 14} 145,${y} S 205,${y - 10} 210,${y - 8}`}
              fill="none"
              stroke="#fff"
              strokeOpacity={0.22 - i * 0.03}
              strokeWidth="1.2"
            />
          ))}
        {variant === 3 && (
          <g transform={`rotate(-24 ${ox} ${oy})`}>
            {[-40, -12, 16, 44, 72, 100].map((y, i) => (
              <rect key={y} x="-60" y={y} width="320" height="14" fill="#fff" fillOpacity={0.05 + (i % 3) * 0.025} />
            ))}
          </g>
        )}
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
      {children}
    </div>
  );
}
