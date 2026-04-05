import { NavLink, useLocation } from "react-router-dom";

const tabs = [
  { to: "/app/accueil",    label: "Accueil",    icon: "🏠" },
  { to: "/app/agenda",     label: "Agenda",     icon: "📅" },
  { to: "/app/habitudes",  label: "Eau",        icon: "💧" },
  { to: "/app/sport",      label: "Sport",      icon: "💪" },
  { to: "/app/finances",   label: "Finances",   icon: "💰" },
  { to: "/app/objectifs",  label: "Objectifs",  icon: "🎯" },
  { to: "/app/notes",      label: "Notes",      icon: "📓" },
  { to: "/app/parametres", label: "Réglages",   icon: "⚙️" },
] as const;

export function TabBar() {
  const { pathname } = useLocation();
  const activeIdx = tabs.findIndex((t) => pathname.startsWith(t.to));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-elevated/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex max-w-3xl px-1 py-1">
        {tabs.map((t, i) => {
          const isActive = i === activeIdx;
          return (
            <NavLink
              key={t.to}
              to={t.to}
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
                {t.icon}
              </span>
              <span
                className="mt-0.5 truncate transition-colors duration-200"
                style={{ color: isActive ? "var(--accent)" : "var(--muted)" }}
              >
                {t.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
