"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Silhouette : le remplissage = indice de régularité 0–100 (comme l’app MyLife d’origine).
 */
export function BodyHydrationVisual({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const clipId = `sil-clip-${uid}`;
  const gradId = `sil-grad-${uid}`;

  const p = Math.min(100, Math.max(0, percent));
  const fillH = (200 * p) / 100;
  const fillY = 200 - fillH;

  const silhouette =
    "M60 20c-9 0-16 7-16 16s7 16 16 16 16-7 16-16-7-16-16-16zm-24 40h48a4 4 0 014 4l-7 46c-1 7-2 14-2 21v62l-11 34h-12l-11-34v-62c0-7-1-14-2-21l-7-46a4 4 0 014-4z";

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <svg viewBox="0 0 120 220" className="h-56 w-36 drop-shadow-sm" aria-hidden>
        <defs>
          <clipPath id={clipId}>
            <path d={silhouette} />
          </clipPath>
          <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.95} />
            <stop offset="50%" stopColor="var(--chart-3)" stopOpacity={0.8} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.45} />
          </linearGradient>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width="120" height="220" className="fill-muted/50" />
          <rect
            x="0"
            y={fillY}
            width="120"
            height={Math.max(0.5, fillH)}
            fill={`url(#${gradId})`}
            className="transition-[y,height] duration-1000 ease-out"
          />
        </g>

        <path
          d={silhouette}
          fill="none"
          className="stroke-border"
          strokeWidth={2.25}
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 text-center">
        <p className="text-2xl font-bold tabular-nums text-primary">{Math.round(p)}%</p>
        <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
          régularité
        </p>
      </div>
    </div>
  );
}
