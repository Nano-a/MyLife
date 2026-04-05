import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { TabBar } from "./TabBar";
import { Toaster } from "./Toaster";
import { useSessionStore } from "../auth/sessionStore";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getPrefs } from "../db";
import type { AppPreferences } from "@mylife/core";
import { LockScreen } from "./LockScreen";

export function AppShell() {
  const touch = useSessionStore((s) => s.touch);
  const unlocked = useSessionStore((s) => s.unlocked);
  const setUnlocked = useSessionStore((s) => s.setUnlocked);
  const location = useLocation();
  const prefsRow = useLiveQuery(() => db.settings.get("prefs"), []);
  const prefs = prefsRow?.value as AppPreferences | undefined;

  useEffect(() => {
    touch();
  }, [location.pathname, touch]);

  useEffect(() => {
    const id = window.setInterval(async () => {
      const p = prefs ?? (await getPrefs());
      if (!p?.pinEnabled || !p.pinHash) return;
      const { lastActivity } = useSessionStore.getState();
      const timeoutMs = p.lockTimeoutMin === 0 ? 0 : p.lockTimeoutMin === 1 ? 60_000 : 300_000;
      if (timeoutMs > 0 && useSessionStore.getState().unlocked) {
        if (Date.now() - lastActivity > timeoutMs) setUnlocked(false);
      }
    }, 10_000);
    return () => window.clearInterval(id);
  }, [prefs, setUnlocked]);

  const showLock = Boolean(prefs?.pinEnabled && prefs?.pinHash && !unlocked);

  if (showLock && prefs?.pinHash) {
    return (
      <LockScreen
        pinHash={prefs.pinHash}
        onUnlocked={() => { setUnlocked(true); touch(); }}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col pb-16">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        {/* key force remount → animation à chaque changement de route */}
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
      <TabBar />
      <Toaster />
    </div>
  );
}
