import { useToastStore } from "../lib/toastStore";

const iconFor = { success: "✓", error: "✕", info: "ℹ" };
const colorFor = {
  success: "bg-[var(--green)] text-white",
  error: "bg-[var(--red)] text-white",
  info: "bg-elevated border border-border text-[var(--text)]",
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={[
            "pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-xl",
            colorFor[t.type],
            t.dying ? "toast-out" : "toast-in",
          ].join(" ")}
        >
          <span className="font-bold">{iconFor[t.type]}</span>
          {t.message}
        </button>
      ))}
    </div>
  );
}
