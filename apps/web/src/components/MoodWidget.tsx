import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "../db";
import type { MoodDay } from "@mylife/core";
import { todayISO } from "../lib/dateUtils";
import { useThemePrefs } from "../theme/ThemeProvider";
import { t } from "../i18n/strings";
import { toast } from "../lib/toastStore";

const SCORES = [1, 2, 3, 4, 5] as const;

export function MoodWidget() {
  const date = todayISO();
  const { prefs } = useThemePrefs();
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
    <section className="rounded-2xl border border-border bg-elevated p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
        {t("moodToday", prefs.language)}
      </p>
      <div className="flex flex-wrap gap-2">
        {SCORES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => void setMood(s)}
            className={[
              "h-10 w-10 rounded-xl border text-lg font-bold transition-colors",
              row?.score === s ? "border-accent bg-accent text-white" : "border-border bg-[var(--surface)]",
            ].join(" ")}
            aria-label={`Humeur ${s} sur 5`}
          >
            {s === 1 ? "😔" : s === 2 ? "😐" : s === 3 ? "🙂" : s === 4 ? "😊" : "🤩"}
          </button>
        ))}
      </div>
      <input
        className="mt-3 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-accent"
        placeholder={t("moodNote", prefs.language)}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </section>
  );
}
