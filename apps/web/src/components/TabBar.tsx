import { NavLink, useLocation } from "react-router-dom";

const tabs = [
  { to: "/app/accueil",    label: "Accueil",    icon: "🏠" },
  { to: "/app/agenda",     label: "Agenda",     icon: "📅" },
  { to: "/app/habitudes",  label: "Habitudes",  icon: "💧" },
  { to: "/app/sport",      label: "Sport",      icon: "💪" },
  { to: "/app/finances",   label: "Finances",   icon: "💰" },
  { to: "/app/objectifs",  label: "Objectifs",  icon: "🎯" },
  { to: "/app/notes",      label: "Notes",      icon: "📓" },
  { to: "/app/parametres", label: "Réglages",   icon: "⚙️" },
] as const;

export function TabBar() {
  const { pathname } = useLocation();
  const activeIdx = tabs.findIndex((tab) => pathname.startsWith(tab.to));

  return (
    <nav
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      aria-label="Navigation principale"
    >
      <div className="pointer-events-auto mx-auto max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--elevated)_88%,transparent)] shadow-float backdrop-blur-2xl sm:max-w-2xl">
        <div className="flex gap-0.5 overflow-x-auto no-scrollbar px-1 py-1.5 sm:justify-center sm:overflow-visible">
          {tabs.map((tab, i) => {
            const isActive = i === activeIdx;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={[
                  "relative flex min-w-[3.25rem] shrink-0 flex-col items-center rounded-xl px-1 py-1 text-[0.62rem] font-medium transition-colors duration-200 sm:min-w-0 sm:flex-1",
                  isActive
                    ? "bg-[var(--accent-dim)] text-[var(--text)]"
                    : "text-muted hover:bg-[color-mix(in_srgb,var(--surface)_65%,transparent)] hover:text-[var(--text)]",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className="text-lg leading-none transition-transform duration-200"
                  style={{ transform: isActive ? "scale(1.14)" : "scale(1)" }}
                  aria-hidden
                >
                  {tab.icon}
                </span>
                <span
                  className="mt-0.5 max-w-[4.25rem] truncate sm:max-w-none"
                  style={{ color: isActive ? "var(--accent)" : undefined }}
                >
                  {tab.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
