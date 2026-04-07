"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type Props = {
  percent: number;
  className?: string;
};

/** Verre / bouteille — remplissage 0–100 % (style LifeFlow, variables du thème). */
export function BottleFill({ percent, className }: Props) {
  const uid = useId().replace(/:/g, "");
  const gradId = `bottle-grad-${uid}`;
  const clipId = `bottle-clip-${uid}`;
  const p = Math.min(100, Math.max(0, percent));
  const h = 100 - p;

  return (
    <div className={cn("relative mx-auto", className)} style={{ width: 120, height: 200 }}>
      <svg viewBox="0 0 100 180" className="h-full w-full drop-shadow-lg" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#4c1d95" stopOpacity={0.9} />
          </linearGradient>
          <clipPath id={clipId}>
            <path d="M30 15 L35 25 L35 160 Q35 172 50 172 Q65 172 65 160 L65 25 L70 15 Z" />
          </clipPath>
        </defs>
        <path
          d="M28 12 L33 22 L33 162 Q33 176 50 176 Q67 176 67 162 L67 22 L72 12 Z"
          fill="none"
          className="stroke-border"
          strokeWidth={3}
        />
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width="100" height="180" className="fill-muted/40" />
          <g
            className="transition-transform duration-700 ease-out"
            style={{ transform: `translateY(${h * 1.55}px)` }}
          >
            <rect x="20" y="0" width="60" height="200" fill={`url(#${gradId})`} />
          </g>
        </g>
      </svg>
    </div>
  );
}
