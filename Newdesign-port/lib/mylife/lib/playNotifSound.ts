import type { AppPreferences } from "@mylife/core";

/** Son court pour notifications web (approximation specs « goutte d’eau », etc.). */
export function playNotificationSound(prefs: AppPreferences | undefined): void {
  const id = prefs?.notifSoundId ?? "defaut";
  if (id === "aucun") return;
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    if (id === "goutte") {
      o.frequency.value = 880;
      o.type = "sine";
      g.gain.value = 0.08;
      o.start();
      o.stop(ctx.currentTime + 0.12);
    } else if (id === "bip") {
      o.frequency.value = 440;
      o.type = "square";
      g.gain.value = 0.04;
      o.start();
      o.stop(ctx.currentTime + 0.06);
    } else {
      o.frequency.value = 600;
      o.type = "triangle";
      g.gain.value = 0.06;
      o.start();
      o.stop(ctx.currentTime + 0.08);
    }
    setTimeout(() => void ctx.close(), 400);
  } catch {
    /* navigateur sans Web Audio */
  }
}
