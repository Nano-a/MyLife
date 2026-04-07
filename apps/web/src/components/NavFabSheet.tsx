import { useNavigate } from "react-router-dom";
import { BookMarked, CheckCircle2, Dumbbell, FileText, Target } from "lucide-react";
import { Modal } from "./Modal";

const FAB_DESTINATIONS = [
  { to: "/app/carnet", label: "Carnet", desc: "Historique & PDF", Icon: BookMarked, iconClass: "icon-objectifs" },
  { to: "/app/habitudes", label: "Habitudes", desc: "Eau, routines", Icon: CheckCircle2, iconClass: "icon-habitudes" },
  { to: "/app/sport", label: "Sport", desc: "Séances & stats", Icon: Dumbbell, iconClass: "icon-sport" },
  { to: "/app/objectifs", label: "Objectifs", desc: "Suivi des buts", Icon: Target, iconClass: "icon-objectifs" },
  { to: "/app/notes", label: "Notes", desc: "Bloc-notes", Icon: FileText, iconClass: "icon-notes" },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NavFabSheet({ open, onClose }: Props) {
  const navigate = useNavigate();

  return (
    <Modal open={open} onClose={onClose} title="Plus" contentId="nav-fab-sheet">
      <p className="mb-4 text-sm text-muted">
        Accès rapide aux sections regroupées (barre du bas : Accueil, Agenda, +, Finances, Réglages).
      </p>
      <ul className="grid grid-cols-2 gap-3">
        {FAB_DESTINATIONS.map((item) => {
          const Ic = item.Icon;
          return (
            <li key={item.to}>
              <button
                type="button"
                className="hover-lift flex w-full flex-col items-start gap-2 rounded-2xl border border-white/5 bg-white/[0.06] p-4 text-left backdrop-blur-xl transition-transform active:scale-[0.98] [html[data-theme=light]_&]:border-black/10 [html[data-theme=light]_&]:bg-black/[0.04]"
                onClick={() => {
                  navigate(item.to);
                  onClose();
                }}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.iconClass}`}>
                  <Ic className="h-6 w-6" aria-hidden />
                </div>
                <span className="text-kimi-ink font-semibold">{item.label}</span>
                <span className="text-xs text-kimi-muted">{item.desc}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
