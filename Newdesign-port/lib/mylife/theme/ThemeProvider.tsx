import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppPreferences } from "@mylife/core";
import { getPrefs, savePrefs } from "../db";
import { defaultPrefs } from "../defaults";

type Ctx = {
  prefs: AppPreferences;
  setPrefs: (p: Partial<AppPreferences>) => Promise<void>;
  refresh: () => Promise<void>;
};

const ThemeContext = createContext<Ctx | null>(null);

function applyDomTheme(p: AppPreferences) {
  const root = document.documentElement;
  if (p.theme === "light") root.dataset.theme = "light";
  else if (p.theme === "amoled") root.dataset.theme = "amoled";
  else root.dataset.theme = "dark";
  root.classList.remove("light", "dark", "amoled");
  if (p.theme === "light") {
    root.classList.add("light");
  } else if (p.theme === "amoled") {
    root.classList.add("dark", "amoled");
  } else {
    root.classList.add("dark");
  }
  root.style.setProperty("--accent", p.accentColor);
  root.dataset.font = p.fontFamily === "inter" ? "inter" : p.fontFamily;
  root.dataset.scale = p.textScale;
  root.lang = "fr";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<AppPreferences>(defaultPrefs);

  const refresh = useCallback(async () => {
    const loaded = await getPrefs();
    const next = loaded ? { ...defaultPrefs, ...loaded } : defaultPrefs;
    setPrefsState(next);
    applyDomTheme(next);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setPrefs = useCallback(
    async (patch: Partial<AppPreferences>) => {
      const merged = { ...prefs, ...patch };
      setPrefsState(merged);
      applyDomTheme(merged);
      await savePrefs(merged);
    },
    [prefs]
  );

  const value = useMemo(() => ({ prefs, setPrefs, refresh }), [prefs, setPrefs, refresh]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePrefs() {
  const c = useContext(ThemeContext);
  if (!c) throw new Error("useThemePrefs hors ThemeProvider");
  return c;
}
