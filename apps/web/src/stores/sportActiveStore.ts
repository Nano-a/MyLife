import { create } from "zustand";
import type { Intensity, SportType } from "@mylife/core";

type ActiveState = {
  libelle: string;
  type: SportType;
  intensite: Intensity;
  templateId?: string;
  startMs: number | null;
  start: (p: {
    libelle: string;
    type: SportType;
    intensite: Intensity;
    templateId?: string;
  }) => void;
  stop: () => void;
};

export const useSportActiveStore = create<ActiveState>((set) => ({
  libelle: "",
  type: "cardio",
  intensite: "moderee",
  templateId: undefined,
  startMs: null,
  start: (p) =>
    set({
      libelle: p.libelle,
      type: p.type,
      intensite: p.intensite,
      templateId: p.templateId,
      startMs: Date.now(),
    }),
  stop: () =>
    set({
      startMs: null,
      libelle: "",
      templateId: undefined,
    }),
}));
