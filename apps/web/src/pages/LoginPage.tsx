import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSessionStore } from "../auth/sessionStore";
import { isFirebaseAuthConfigured, signInWithGooglePopup } from "../auth/firebaseAuth";
import { toast } from "../lib/toastStore";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const loc = useLocation();
  const signInLocal = useSessionStore((s) => s.signInLocal);
  const signInGoogle = useSessionStore((s) => s.signInGoogle);
  const [googleLoading, setGoogleLoading] = useState(false);

  const from = (loc.state as { from?: { pathname: string } })?.from?.pathname ?? "/app/accueil";
  const firebaseOk = isFirebaseAuthConfigured();

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const res = await signInWithGooglePopup();
      if (!res.ok) {
        if (res.code !== "auth/popup-closed-by-user") toast.info(res.error);
        return;
      }
      const email = res.user.email;
      if (!email) {
        toast.info("Compte Google sans e-mail — connexion impossible.");
        return;
      }
      signInGoogle(email, res.user.uid);
      navigate(from, { replace: true });
      toast.ok("Connecté avec Google — synchronisation Firestore active.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10 sm:px-8">
      <div className="w-full max-w-md rounded-[1.75rem] elevated-surface px-7 py-9 text-center shadow-modal backdrop-blur-xl sm:px-10 sm:py-11">
        <div className="mx-auto mb-5 grid h-[4.75rem] w-[4.75rem] place-items-center rounded-2xl bg-accent text-4xl shadow-float ring-1 ring-white/10">
          🌟
        </div>
        <h1 className="text-3xl font-bold tracking-tight">MyLife</h1>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          Connexion avec Google pour la multi-appareils et la sync Firestore (spec). Mode hors-ligne
          conservé sur chaque appareil.
        </p>

        <div className="mt-9 flex flex-col gap-3">
          {firebaseOk ? (
            <>
              <button
                type="button"
                disabled={googleLoading}
                className="btn-accent-gradient flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-60"
                onClick={() => void handleGoogle()}
              >
                <GoogleMark className="h-6 w-6 shrink-0" />
                {googleLoading ? "Connexion…" : "Continuer avec Google"}
              </button>
              <button
                type="button"
                className="w-full rounded-2xl elevated-surface py-3.5 text-sm text-muted hover:text-[var(--text)] active:scale-[0.98]"
                onClick={() => {
                  signInLocal();
                  navigate(from, { replace: true });
                }}
              >
                Continuer sans compte (local uniquement, pas de sync cloud)
              </button>
            </>
          ) : (
            <>
              <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Firebase non configuré : ajoute <code className="text-[0.65rem]">VITE_FIREBASE_*</code> dans{" "}
                <code className="text-[0.65rem]">apps/web/.env</code> pour activer Google + Firestore.
              </p>
              <button
                type="button"
                className="w-full rounded-2xl elevated-surface py-4 text-sm font-medium text-muted hover:text-[var(--text)] active:scale-[0.98]"
                onClick={() => {
                  signInLocal();
                  navigate(from, { replace: true });
                }}
              >
                Mode démo — données 100 % locales
              </button>
            </>
          )}
        </div>

        <p className="mt-5 text-xs text-muted leading-relaxed">
          PIN, passkey et export JSON disponibles dans les réglages. Interface en français.
        </p>
      </div>
    </div>
  );
}
