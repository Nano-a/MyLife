import type { FinanceSubscription } from "./types.js";

const MS_DAY = 86_400_000;

function parseYmd(s: string): { y: number; m0: number; d: number } {
  const [y, m, d] = s.split("-").map(Number);
  return { y: y!, m0: (m ?? 1) - 1, d: d ?? 1 };
}

function daysInMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate();
}

function ymd(y: number, m0: number, d: number): string {
  const dd = Math.min(d, daysInMonth(y, m0));
  return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function monthActive(sub: FinanceSubscription, m0: number): boolean {
  if (!sub.moisActifs?.length) return true;
  return sub.moisActifs.includes(m0);
}

/** Le prélèvement a-t-il lieu ce mois-ci (calendrier) ? */
export function subscriptionChargeThisMonth(sub: FinanceSubscription, ref: Date = new Date()): boolean {
  const m0 = ref.getMonth();
  if (sub.period === "daily") return monthActive(sub, m0);
  if (sub.period === "monthly") return monthActive(sub, m0);
  /* yearly : même mois que la date d’ancrage */
  const { m0: anchorM } = parseYmd(sub.dateDebut);
  return m0 === anchorM;
}

/** Montant compté pour un mois donné (0 si pas de prélèvement ce mois-là) */
export function subscriptionAmountForMonth(
  sub: FinanceSubscription,
  year: number,
  month0: number
): number {
  const d = new Date(year, month0, 15);
  if (!subscriptionChargeThisMonth(sub, d)) return 0;
  if (sub.period === "daily") return sub.montant * daysInMonth(year, month0);
  return sub.montant;
}

/** Dates ISO (YYYY-MM-DD) où a lieu un prélèvement / versement dans ce mois (pour calendrier). */
export function subscriptionChargesInMonth(
  sub: FinanceSubscription,
  year: number,
  month0: number
): string[] {
  if (subscriptionAmountForMonth(sub, year, month0) <= 0) return [];

  const finMs = sub.finLe ? new Date(sub.finLe + "T23:59:59.999").getTime() : Number.POSITIVE_INFINITY;
  const lastDay = daysInMonth(year, month0);

  if (sub.period === "daily") {
    const out: string[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const noon = new Date(year, month0, d, 12, 0, 0).getTime();
      if (noon > finMs) continue;
      out.push(ymd(year, month0, d));
    }
    return out;
  }

  if (sub.period === "yearly") {
    const { m0: anchorM } = parseYmd(sub.dateDebut);
    if (month0 !== anchorM) return [];
    const d = Math.min(sub.jourPrelevement, lastDay);
    const noon = new Date(year, month0, d, 12, 0, 0).getTime();
    if (noon > finMs) return [];
    return [ymd(year, month0, d)];
  }

  const d = Math.min(sub.jourPrelevement, lastDay);
  const noon = new Date(year, month0, d, 12, 0, 0).getTime();
  if (noon > finMs) return [];
  return [ymd(year, month0, d)];
}

/**
 * Prochaine date de prélèvement (YYYY-MM-DD) après `ref` (exclusive), ou null.
 */
export function nextChargeDate(sub: FinanceSubscription, ref: Date = new Date()): string | null {
  const refDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
  const finMs = sub.finLe
    ? new Date(sub.finLe + "T23:59:59.999").getTime()
    : Number.POSITIVE_INFINITY;

  if (refDay > finMs) return null;

  if (sub.period === "daily") {
    let t = refDay + MS_DAY;
    while (t <= finMs) {
      const d = new Date(t);
      if (monthActive(sub, d.getMonth())) return ymd(d.getFullYear(), d.getMonth(), d.getDate());
      t += MS_DAY;
      if (t > refDay + 400 * MS_DAY) break;
    }
    return null;
  }

  if (sub.period === "yearly") {
    const { m0: mAnchor, d: dAnchor } = parseYmd(sub.dateDebut);
    let y = ref.getFullYear();
    for (let k = 0; k < 6; k++) {
      const dm = Math.min(sub.jourPrelevement || dAnchor, daysInMonth(y, mAnchor));
      const cand = new Date(y, mAnchor, dm).getTime();
      if (cand > refDay && cand <= finMs && monthActive(sub, mAnchor)) {
        return ymd(y, mAnchor, dm);
      }
      y += 1;
    }
    return null;
  }

  /* monthly */
  let y = ref.getFullYear();
  let m0 = ref.getMonth();
  for (let i = 0; i < 36; i++) {
    if (!monthActive(sub, m0)) {
      m0 += 1;
      if (m0 > 11) {
        m0 = 0;
        y += 1;
      }
      continue;
    }
    const dm = Math.min(sub.jourPrelevement, daysInMonth(y, m0));
    const cand = new Date(y, m0, dm).getTime();
    if (cand > refDay && cand <= finMs) return ymd(y, m0, dm);
    m0 += 1;
    if (m0 > 11) {
      m0 = 0;
      y += 1;
    }
  }
  return null;
}

/** Libellés mois pour l’UI */
export const MOIS_COURTS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
] as const;

export function describeSubscriptionPeriod(sub: FinanceSubscription): string {
  if (sub.period === "daily") return sub.moisActifs?.length ? "Chaque jour (mois filtrés)" : "Chaque jour";
  if (sub.period === "yearly") return "Une fois par an";
  if (sub.moisActifs?.length) {
    const sorted = [...sub.moisActifs].sort((a, b) => a - b);
    return `Mensuel : ${sorted.map((m) => MOIS_COURTS[m]).join(", ")}`;
  }
  return `Mensuel, le ${sub.jourPrelevement} de chaque mois`;
}
