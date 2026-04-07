"use client";

import { useEffect, type ReactNode } from "react";
import { FirebaseAuthSync } from "@/lib/mylife/auth/FirebaseAuthSync";
import { useSessionStore } from "@/lib/mylife/auth/sessionStore";
import { ThemeProvider } from "@/lib/mylife/theme/ThemeProvider";
import { LifeFlowDataProvider } from "@/components/lifeflow-data-provider";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    useSessionStore.getState().signInLocal();
  }, []);

  return (
    <ThemeProvider>
      <FirebaseAuthSync />
      <LifeFlowDataProvider>{children}</LifeFlowDataProvider>
    </ThemeProvider>
  );
}
