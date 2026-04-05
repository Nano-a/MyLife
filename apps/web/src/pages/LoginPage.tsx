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
      signInGoogle(email);
      navigate(from, { replace: true });
      toast.ok("Connecté avec Google");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-accent text-4xl shadow-xl shadow-accent/30">
          🌟
        </div>
        <h1 className="text-3xl font-bold tracking-tight">MyLife</h1>
        <p className="mt-2 text-sm text-muted">
          Habitudes, eau, sport, finances, objectifs — tout en local sur ton appareil.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <button
            type="button"
            className="w-full rounded-2xl bg-accent py-4 text-base font-semibold text-white shadow-lg shadow-accent/30 hover:opacity-90 active:scale-[0.98]"
            onClick={() => {
              signInLocal();
              navigate(from, { replace: true });
            }}
          >
            Commencer
          </button>

          {firebaseOk && (
            <button
              type="button"
              disabled={googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-elevated py-3.5 text-sm font-medium text-muted transition-all hover:text-[var(--text)] active:scale-[0.98] disabled:opacity-60"
              onClick={() => void handleGoogle()}
            >
              <GoogleMark className="h-5 w-5 shrink-0" />
              {googleLoading ? "Connexion…" : "Avec Google (optionnel)"}
            </button>
          )}
        </div>

        <p className="mt-5 text-xs text-muted leading-relaxed">
          Rien à créer ni à configurer : tes notes et données restent sur ce téléphone ou cet
          ordinateur (navigateur).
        </p>
      </div>
    </div>
  );
}
