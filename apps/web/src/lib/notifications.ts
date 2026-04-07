import type { AgendaEvent, AppPreferences } from "@mylife/core";
import { playNotificationSound } from "./playNotifSound";

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Plage globale des notifications (réglages) */
export function inNotifWindow(prefs: AppPreferences, now = new Date()): boolean {
  const start = prefs.notifWindowStart ?? "07:00";
  const end = prefs.notifWindowEnd ?? "22:00";
  const cur = now.getHours() * 60 + now.getMinutes();
  const a = timeToMin(start);
  const b = timeToMin(end);
  if (b > a) return cur >= a && cur <= b;
  return cur >= a || cur <= b;
}

/** Ne pas déranger (réglages) */
export function inAnyDnd(prefs: AppPreferences, now = new Date()): boolean {
  const periods = prefs.dndPeriods ?? [];
  const cur = now.getHours() * 60 + now.getMinutes();
  for (const p of periods) {
    if (!p.enabled) continue;
    const s = timeToMin(p.start);
    const e = timeToMin(p.end);
    if (e > s) {
      if (cur >= s && cur <= e) return true;
    } else {
      if (cur >= s || cur <= e) return true;
    }
  }
  return false;
}

const firedAgendaKeys = new Set<string>();

/** Demande la permission navigateur (une fois). */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

/**
 * Vérifie les événements avec rappel et envoie une notification locale
 * (onglet ouvert ou PWA au premier plan — pas de push serveur).
 */
export function tickAgendaReminders(
  prefs: AppPreferences | undefined,
  events: AgendaEvent[]
): void {
  if (!prefs?.notifAgenda || Notification.permission !== "granted") return;
  if (!inNotifWindow(prefs) || inAnyDnd(prefs)) return;

  const now = Date.now();
  const windowMs = 45_000;

  for (const ev of events) {
    const mins = ev.rappelMinutes;
    if (mins == null || mins <= 0) continue;
    const fireAt = ev.debut - mins * 60_000;
    if (now < fireAt || now > fireAt + windowMs) continue;
    const key = `${ev.id}_${fireAt}`;
    if (firedAgendaKeys.has(key)) continue;
    firedAgendaKeys.add(key);
    if (firedAgendaKeys.size > 500) firedAgendaKeys.clear();

    try {
      const base = import.meta.env.BASE_URL || "/";
      const icon =
        typeof window !== "undefined"
          ? `${window.location.origin}${base.endsWith("/") ? base : `${base}/`}icon-192.png`
          : undefined;
      playNotificationSound(prefs);
      new Notification(ev.titre, {
        body: `Dans ${mins} min${ev.lieu ? ` · ${ev.lieu}` : ""}`,
        tag: key,
        ...(icon ? { icon } : {}),
      });
    } catch {
      /* ignore */
    }
  }
}
