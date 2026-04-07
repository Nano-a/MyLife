import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useThemePrefs } from "../theme/ThemeProvider";
import { toast } from "../lib/toastStore";

/**
 * Plein écran au-dessus de toute l’UI : aperçu du fond sur l’accueil, oblige à accepter ou refuser.
 * Le navigateur ne permet pas de « fermer l’app » : on indique de fermer l’onglet.
 */
export function WallpaperPreviewGate() {
  const { prefs, setPrefs } = useThemePrefs();
  const navigate = useNavigate();
  const location = useLocation();
  const pending = prefs.wallpaperPendingDataUrl;

  useEffect(() => {
    if (!pending) return;
    if (location.pathname !== "/app/accueil") {
      navigate("/app/accueil", { replace: true });
    }
  }, [pending, location.pathname, navigate]);

  useEffect(() => {
    if (!pending) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pending]);

  if (!pending) return null;

  async function accept() {
    await setPrefs({
      wallpaperDataUrl: pending,
      wallpaperPendingDataUrl: undefined,
    });
    toast.ok("Fond d’écran appliqué");
  }

  async function refuse() {
    await setPrefs({ wallpaperPendingDataUrl: undefined });
    toast.info("Fond d’écran non conservé");
  }

  const shell = (
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallpaper-preview-title"
    >
      {/* Fond plein écran = rendu réel derrière l’app */}
      <img src={pending} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/70 [html[data-theme=light]_&]:from-white/50 [html[data-theme=light]_&]:via-white/40 [html[data-theme=light]_&]:to-white/60" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6">
        <p id="wallpaper-preview-title" className="mb-2 text-center text-sm font-semibold text-white drop-shadow-md [html[data-theme=light]_&]:text-zinc-900 [html[data-theme=light]_&]:drop-shadow-none">
          Aperçu sur l’accueil
        </p>
        <p className="mb-5 max-w-sm text-center text-xs text-white/85 [html[data-theme=light]_&]:text-zinc-800">
          Comme sur la page d’accueil : le fond couvre tout l’écran, le contenu reste lisible avec un voile.
        </p>

        {/* Cadre type téléphone : miniature de l’effet */}
        <div
          className="mb-6 w-[min(100%,280px)] overflow-hidden rounded-[2rem] border-4 border-white/25 bg-black shadow-2xl [html[data-theme=light]_&]:border-zinc-400/50"
          style={{ aspectRatio: "9 / 19" }}
        >
          <div className="relative h-full w-full">
            <img src={pending} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
            <div className="absolute inset-0 bg-black/40 [html[data-theme=light]_&]:bg-white/35" />
            <div className="absolute left-3 right-3 top-10 rounded-2xl border border-white/15 bg-black/35 p-3 backdrop-blur-md [html[data-theme=light]_&]:border-black/10 [html[data-theme=light]_&]:bg-white/40">
              <p className="text-[10px] font-bold text-white [html[data-theme=light]_&]:text-zinc-900">Accueil</p>
              <p className="mt-1 text-[9px] text-white/80 [html[data-theme=light]_&]:text-zinc-700">Modules · hydratation…</p>
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-3">
          <button
            type="button"
            onClick={() => void accept()}
            className="w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-bold text-white shadow-lg hover:bg-emerald-500 active:scale-[0.99]"
          >
            J’accepte ce fond
          </button>
          <button
            type="button"
            onClick={() => void refuse()}
            className="w-full rounded-2xl border-2 border-white/40 bg-white/10 py-3.5 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20 active:scale-[0.99] [html[data-theme=light]_&]:border-zinc-600 [html[data-theme=light]_&]:bg-white/60 [html[data-theme=light]_&]:text-zinc-900"
          >
            Je refuse
          </button>
        </div>

        <p className="mt-8 max-w-xs text-center text-[0.7rem] text-white/60 [html[data-theme=light]_&]:text-zinc-600">
          Tu ne peux pas utiliser l’app tant que tu n’as pas choisi. Pour quitter sans décider, ferme cet onglet ou
          l’application.
        </p>
      </div>
    </div>
  );

  return createPortal(shell, document.body);
}
