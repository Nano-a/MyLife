import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Pour aria-controls (ex. bouton FAB) */
  contentId?: string;
};

export function Modal({ open, onClose, title, children, contentId = "mylife-modal-panel" }: Props) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-md sm:items-center"
      onClick={onClose}
    >
      <div
        id={contentId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal-sheet w-full max-w-lg rounded-t-[1.75rem] elevated-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-modal backdrop-blur-xl sm:rounded-[1.75rem] sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full elevated-surface text-muted hover:text-[var(--text)]"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
