import { NavLink, useLocation } from "react-router-dom";
import { useThemePrefs } from "../theme/ThemeProvider";
import { t } from "../i18n/strings";

const tabs = [
  { to: "/app/accueil",    key: "tabHome" as const,    icon: "🏠" },
  { to: "/app/agenda",     key: "tabAgenda" as const,  icon: "📅" },
  { to: "/app/habitudes",  key: "tabHabits" as const,  icon: "💧" },
  { to: "/app/sport",      key: "tabSport" as const,   icon: "💪" },
  { to: "/app/finances",   key: "tabFinance" as const, icon: "💰" },
  { to: "/app/objectifs",  key: "tabGoals" as const,   icon: "🎯" },
  { to: "/app/notes",      key: "tabNotes" as const,   icon: "📓" },
  { to: "/app/parametres", key: "tabSettings" as const, icon: "⚙️" },
] as const;

export function TabBar() {
  const { pathname } = useLocation();
  const { prefs } = useThemePrefs();
  const lng = prefs.language;
  const activeIdx = tabs.findIndex((tab) => pathname.startsWith(tab.to));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-elevated/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex max-w-3xl px-1 py-1">
        {tabs.map((tab, i) => {
          const isActive = i === activeIdx;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="relative flex flex-1 flex-col items-center py-1.5 text-[0.6rem]"
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <span
                  className="absolute inset-x-1 top-0 h-0.5 rounded-full bg-accent"
                  style={{ transition: "none" }}
                />
              )}
              <span
                className="text-lg leading-none transition-transform duration-200"
                style={{ transform: isActive ? "scale(1.18)" : "scale(1)" }}
                aria-hidden
              >
                {tab.icon}
              </span>
              <span
                className="mt-0.5 truncate transition-colors duration-200"
                style={{ color: isActive ? "var(--accent)" : "var(--muted)" }}
              >
                {t(tab.key, lng)}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
