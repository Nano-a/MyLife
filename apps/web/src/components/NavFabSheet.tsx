import { useNavigate } from "react-router-dom";
import { Modal } from "./Modal";

const FAB_DESTINATIONS = [
  { to: "/app/habitudes", label: "Habitudes", desc: "Eau, routines", icon: "💧" },
  { to: "/app/sport", label: "Sport", desc: "Séances & stats", icon: "💪" },
  { to: "/app/objectifs", label: "Objectifs", desc: "Suivi des buts", icon: "🎯" },
  { to: "/app/notes", label: "Notes", desc: "Bloc-notes", icon: "📓" },
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
        {FAB_DESTINATIONS.map((item) => (
          <li key={item.to}>
            <button
              type="button"
              className="flex w-full flex-col items-start gap-1 rounded-2xl glass-panel p-4 text-left transition-transform hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                navigate(item.to);
                onClose();
              }}
            >
              <span className="text-2xl" aria-hidden>
                {item.icon}
              </span>
              <span className="font-semibold">{item.label}</span>
              <span className="text-xs text-muted">{item.desc}</span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
