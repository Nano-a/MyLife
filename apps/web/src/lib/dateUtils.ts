function padDatePart(n: number): string {
  return String(n).padStart(2, "0");
}

export function dateISOFromLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = padDatePart(d.getMonth() + 1);
  const day = padDatePart(d.getDate());
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return dateISOFromLocalDate(new Date());
}

/** Date locale (YYYY-MM-DD) correspondant à un instant (séance sport, etc.). */
export function dateISOFromTimestamp(ts: number): string {
  return dateISOFromLocalDate(new Date(ts));
}

export function formatFrDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
