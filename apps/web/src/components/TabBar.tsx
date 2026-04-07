import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { Calendar, Home, Settings, Wallet } from "lucide-react";
import { NavFabSheet } from "./NavFabSheet";

const PRIMARY_LEFT = [
  { to: "/app/accueil", label: "Accueil", Icon: Home },
  { to: "/app/agenda", label: "Agenda", Icon: Calendar },
] as const;

const PRIMARY_RIGHT = [
  { to: "/app/finances", label: "Finances", Icon: Wallet },
  { to: "/app/parametres", label: "Réglages", Icon: Settings },
] as const;

const FAB_PREFIXES = ["/app/habitudes", "/app/sport", "/app/objectifs", "/app/notes", "/app/carnet"] as const;

function DockLink({
  to,
  label,
  Icon,
  active,
}: {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={[
        "flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 rounded-xl py-1.5 text-[0.65rem] font-medium transition-colors duration-200",
        active ? "text-orange-400" : "text-zinc-500 hover:text-kimi-ink",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={[
          "h-5 w-5 transition-transform duration-200",
          active ? "scale-110 drop-shadow-[0_0_8px_rgba(249,115,22,0.45)]" : "",
        ].join(" ")}
        aria-hidden
      />
      <span className="text-kimi-ink max-w-[4.5rem] truncate">{label}</span>
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
              fabActive
                ? "ring-2 ring-orange-400 ring-offset-2 ring-offset-black [html[data-theme=light]_&]:ring-offset-white"
                : "",
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
            className="relative overflow-hidden rounded-t-[1.85rem] border border-b-0 border-white/10 bg-[var(--nav-glass)] shadow-float backdrop-blur-2xl [html[data-theme=light]_&]:border-black/10"
            style={{
              boxShadow: "0 -10px 40px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <svg
              className="pointer-events-none absolute left-0 right-0 top-0 h-3 w-full text-white/8 [html[data-theme=light]_&]:text-black/5"
              viewBox="0 0 400 12"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path fill="currentColor" d="M0,12 L0,4 Q100,10 200,2 Q300,10 400,4 L400,12 Z" />
            </svg>

            <div className="flex items-end justify-between gap-0 px-1 pb-1.5 pt-9">
              <div className="flex min-w-0 flex-1 justify-around gap-0">
                {PRIMARY_LEFT.map((tab) => (
                  <DockLink
                    key={tab.to}
                    to={tab.to}
                    label={tab.label}
                    Icon={tab.Icon}
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
                    Icon={tab.Icon}
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
