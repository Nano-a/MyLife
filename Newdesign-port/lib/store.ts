"use client";

import { useLifeFlowData } from "@/components/lifeflow-data-provider";
import { useNavStore } from "@/lib/nav-store";

/** Données Dexie + préférences + navigation (onglet courant). */
export function useStore() {
  const data = useLifeFlowData();
  const nav = useNavStore();
  return { ...data, ...nav };
}
