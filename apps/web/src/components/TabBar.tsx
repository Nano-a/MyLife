import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { NavFabSheet } from "./NavFabSheet";

const PRIMARY_LEFT = [
  { to: "/app/accueil", label: "Accueil", icon: "🏠" },
  { to: "/app/agenda", label: "Agenda", icon: "📅" },
] as const;

const PRIMARY_RIGHT = [
  { to: "/app/finances", label: "Finances", icon: "💰" },
  { to: "/app/parametres", label: "Réglages", icon: "⚙️" },
] as const;

const FAB_PREFIXES = ["/app/habitudes", "/app/sport", "/app/objectifs", "/app/notes"] as const;

function DockLink({
  to,
  label,
  icon,
  active,
}: {
  to: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={[
        "flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 rounded-xl py-1.5 text-[0.65rem] font-medium transition-colors duration-200",
        active ? "text-[var(--fab-cyan)]" : "text-muted hover:text-[var(--text)]",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <span
        className="text-[1.35rem] leading-none transition-transform duration-200"
        style={{ transform: active ? "scale(1.12)" : "scale(1)" }}
        aria-hidden
      >
        {icon}
      </span>
      <span className="max-w-[4.5rem] truncate">{label}</span>
    </NavLink>
  );
}

export function TabBar() {
  const { pathname } = useLocation();
  const [fabOpen, setFabOpen] = useState(false);
  const fabActive = FAB_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <>
      <NavFabSheet open={fabOpen} onClose={() => setFabOpen(false)} />
      <nav
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-40"
        aria-label="Navigation principale"
      >
        <div className="pointer-events-auto relative mx-auto max-w-lg px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))] sm:max-w-xl">
          <button
            type="button"
            className={[
              "nav-dock-fab absolute left-1/2 z-20 -translate-x-1/2 -top-5",
              fabActive ? "ring-2 ring-[var(--fab-cyan)] ring-offset-2 ring-offset-[color-mix(in_srgb,var(--surface)_90%,transparent)]" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setFabOpen(true)}
            aria-expanded={fabOpen}
            aria-haspopup="dialog"
            aria-controls="nav-fab-sheet"
            aria-label="Ouvrir le menu : Habitudes, Sport, Objectifs, Notes"
          >
            +
          </button>

          <div
            className="relative overflow-hidden rounded-t-[1.85rem] border border-b-0 border-white/10 bg-[var(--nav-glass)] shadow-float backdrop-blur-2xl"
            style={{
              boxShadow: "0 -10px 40px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            {/* Courbe discrète en haut (effet « vague ») */}
            <svg
              className="pointer-events-none absolute left-0 right-0 top-0 h-3 w-full text-white/8"
              viewBox="0 0 400 12"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                fill="currentColor"
                d="M0,12 L0,4 Q100,10 200,2 Q300,10 400,4 L400,12 Z"
              />
            </svg>

            <div className="flex items-end justify-between gap-0 px-1 pb-1.5 pt-9">
              <div className="flex min-w-0 flex-1 justify-around gap-0">
                {PRIMARY_LEFT.map((tab) => (
                  <DockLink
                    key={tab.to}
                    to={tab.to}
                    label={tab.label}
                    icon={tab.icon}
                    active={pathname.startsWith(tab.to)}
                  />
                ))}
              </div>
              <div className="w-12 shrink-0" aria-hidden />
              <div className="flex min-w-0 flex-1 justify-around gap-0">
                {PRIMARY_RIGHT.map((tab) => (
                  <DockLink
                    key={tab.to}
                    to={tab.to}
                    label={tab.label}
                    icon={tab.icon}
                    active={pathname.startsWith(tab.to)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
