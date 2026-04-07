"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NavigationTab } from "@/lib/types";

type NavState = {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
};

export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      currentTab: "dashboard",
      setCurrentTab: (tab) => set({ currentTab: tab }),
    }),
    { name: "lifeflow-nav-tab" }
  )
);
