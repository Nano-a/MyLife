import { useState } from "react";
import { verifyPin } from "../lib/pin";
import { useThemePrefs } from "../theme/ThemeProvider";
import { authenticateLocalPasskey, isWebAuthnAvailable } from "../lib/webauthnLocal";

type Props = {
  pinHash: string;
  onUnlocked: () => void;
};

export function LockScreen({ pinHash, onUnlocked }: Props) {
  const { prefs } = useThemePrefs();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const canPasskey =
    isWebAuthnAvailable() &&
    Boolean(prefs.webAuthnCredentialIds?.trim());

  async function tryPasskey() {
    const ok = await authenticateLocalPasskey(prefs.webAuthnCredentialIds);
    if (ok) {
      setErr(false);
      onUnlocked();
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(false);
    const ok = await verifyPin(pin, pinHash);
    if (ok) {
      setPin("");
      onUnlocked();
    } else {
      setErr(true);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm rounded-[1.35rem] elevated-surface p-7 shadow-modal backdrop-blur-xl">
        <h1 className="text-center text-xl font-semibold tracking-tight">MyLife verrouillé</h1>
        <p className="mt-2 text-center text-sm text-muted">
          Saisis ton code PIN pour continuer.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-accent"
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            aria-invalid={err}
          />
          {err && (
            <p className="text-center text-sm text-red-400" role="alert">
              Code incorrect
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-accent py-3 font-medium text-white transition-opacity hover:opacity-90"
          >
            Déverrouiller
          </button>
        </form>
        {canPasskey && (
          <button
            type="button"
            onClick={() => void tryPasskey()}
            className="mt-3 w-full rounded-xl border border-border py-3 text-sm font-medium text-muted hover:border-accent hover:text-[var(--text)]"
          >
            Déverrouiller avec la biométrie / clé d’accès
          </button>
        )}
      </div>
    </div>
  );
}
