import { useEffect, useState } from "react";
import type { Habit, HabitSkipKind } from "@mylife/core";
import { db } from "../db";
import { todayISO } from "../lib/dateUtils";
import { Modal } from "./Modal";
import { toast } from "../lib/toastStore";

type Props = {
  habit: Habit | null;
  open: boolean;
  onClose: () => void;
};

export function HabitSkipModal({ habit, open, onClose }: Props) {
  const date = todayISO();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open, habit?.id]);

  async function markDone() {
    if (!habit) return;
    const id = `${habit.id}_${date}`;
    await db.habitCompletions.put({ id, habitId: habit.id, date, fait: true });
    toast.ok(`${habit.icone} ${habit.nom} — fait !`);
    onClose();
  }

  async function markSkip(kind: HabitSkipKind) {
    if (!habit) return;
    const t = reason.trim();
    if (t.length < 2) {
      toast.info("Écris au moins quelques mots pour le motif.");
      return;
    }
    const id = `${habit.id}_${date}`;
    await db.habitCompletions.put({
      id,
      habitId: habit.id,
      date,
      fait: false,
      skipReason: t,
      skipKind: kind,
    });
    toast.info("Enregistré pour le diagramme des habitudes.");
    onClose();
  }

  if (!habit) return null;

  return (
    <Modal open={open} onClose={onClose} title={`${habit.icone} ${habit.nom}`}>
      <div className="space-y-4">
        <p className="text-sm text-muted">
          As-tu terminé cette habitude aujourd’hui, ou pas ?
        </p>
        <button
          type="button"
          onClick={() => void markDone()}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-white active:scale-[0.98]"
        >
          J’ai fini
        </button>

        <div className="rounded-xl border border-border bg-[var(--surface)] p-3">
          <p className="mb-2 text-xs font-medium text-muted">Je ne l’ai pas fait</p>
          <textarea
            className="mb-3 min-h-[88px] w-full resize-y rounded-lg border border-border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-accent"
            placeholder="Pourquoi ? (obligatoire pour enregistrer)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="mb-2 text-xs text-muted">
            Choisis la couleur sur le diagramme : orange = situation plus forte que toi (ex. malade), rouge = pas une
            excuse (ex. flemme).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void markSkip("legitime")}
              className="rounded-xl border-2 border-amber-600/70 bg-amber-600/15 py-2.5 text-sm font-semibold text-amber-200 active:scale-[0.98]"
            >
              Orange — légitime
            </button>
            <button
              type="button"
              onClick={() => void markSkip("excuse")}
              className="rounded-xl border-2 border-red-600/70 bg-red-600/15 py-2.5 text-sm font-semibold text-red-200 active:scale-[0.98]"
            >
              Rouge — excuse
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
