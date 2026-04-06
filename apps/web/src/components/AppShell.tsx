import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { TabBar } from "./TabBar";
import { Toaster } from "./Toaster";
import { useSessionStore } from "../auth/sessionStore";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getPrefs } from "../db";
import type { AppPreferences } from "@mylife/core";
import { LockScreen } from "./LockScreen";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { OnboardingModal } from "./OnboardingModal";
import { tickAgendaReminders } from "../lib/notifications";
import { useThemePrefs } from "../theme/ThemeProvider";
import { t } from "../i18n/strings";

export function AppShell() {
  const touch = useSessionStore((s) => s.touch);
  const unlocked = useSessionStore((s) => s.unlocked);
  const setUnlocked = useSessionStore((s) => s.setUnlocked);
  const location = useLocation();
  const prefsRow = useLiveQuery(() => db.settings.get("prefs"), []);
  const prefs = prefsRow?.value as AppPreferences | undefined;
  const { prefs: themePrefs, setPrefs: setThemePrefs } = useThemePrefs();
  const [searchOpen, setSearchOpen] = useState(false);

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

  useEffect(() => {
    const id = window.setInterval(() => {
      void (async () => {
        const p = prefs ?? (await getPrefs()) ?? undefined;
        const ev = await db.events.toArray();
        tickAgendaReminders(p, ev);
      })();
    }, 20_000);
    return () => window.clearInterval(id);
  }, [prefs]);

  const showLock = Boolean(prefs?.pinEnabled && prefs?.pinHash && !unlocked);

  if (showLock && prefs?.pinHash) {
    return (
      <LockScreen
        pinHash={prefs.pinHash}
        onUnlocked={() => {
          setUnlocked(true);
          touch();
        }}
      />
    );
  }

  const showOnboarding = prefs && !prefs.onboardingCompleted;

  return (
    <div className="flex min-h-dvh flex-col pb-16">
      <a
        href="#main-content"
        className="pointer-events-none fixed left-4 top-4 z-[100] -translate-y-[200%] rounded-xl bg-accent px-4 py-2 text-sm text-white opacity-0 shadow-lg transition-all focus:pointer-events-auto focus:translate-y-0 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/80"
      >
        {t("skipToContent", themePrefs.language)}
      </a>
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="fixed right-4 top-[max(0.75rem,env(safe-area-inset-top))] z-30 grid h-10 w-10 place-items-center rounded-full border border-border bg-elevated/95 text-lg shadow-md backdrop-blur-sm hover:border-accent active:scale-95"
        aria-label={t("searchTitle", themePrefs.language)}
      >
        🔍
      </button>
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      {showOnboarding && (
        <OnboardingModal
          open
          onClose={() => void setThemePrefs({ onboardingCompleted: true })}
        />
      )}
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-4" tabIndex={-1}>
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
