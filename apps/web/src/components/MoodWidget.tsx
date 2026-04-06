import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "../db";
import type { MoodDay } from "@mylife/core";
import { todayISO } from "../lib/dateUtils";
import { toast } from "../lib/toastStore";

const SCORES = [1, 2, 3, 4, 5] as const;

export function MoodWidget() {
  const date = todayISO();
  const row = useLiveQuery(() => db.moodDays.get(date), [date]);
  const [note, setNote] = useState(row?.note ?? "");

  useEffect(() => {
    setNote(row?.note ?? "");
  }, [row?.note, date]);

  async function setMood(score: (typeof SCORES)[number]) {
    const entry: MoodDay = {
      date,
      score,
      note: note.trim() || undefined,
      updatedAt: Date.now(),
    };
    await db.moodDays.put(entry);
    toast.ok("Humeur enregistrée");
  }

  return (
    <section className="glass-panel p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
        Humeur du jour
      </p>
      <div className="flex flex-wrap gap-2">
        {SCORES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => void setMood(s)}
            className={[
              "h-10 w-10 rounded-xl border text-lg font-bold transition-colors",
              row?.score === s
                ? "border-[var(--fab-cyan)] bg-[color-mix(in_srgb,var(--fab-cyan)_35%,transparent)] text-[var(--text)] shadow-[0_0_16px_color-mix(in_srgb,var(--fab-cyan)_25%,transparent)]"
                : "border-white/10 bg-[color-mix(in_srgb,var(--surface)_50%,transparent)] backdrop-blur-sm",
            ].join(" ")}
            aria-label={`Humeur ${s} sur 5`}
          >
            {s === 1 ? "😔" : s === 2 ? "😐" : s === 3 ? "🙂" : s === 4 ? "😊" : "🤩"}
          </button>
        ))}
      </div>
      <input
        className="mt-3 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-accent"
        placeholder="Note (optionnel)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </section>
  );
}
