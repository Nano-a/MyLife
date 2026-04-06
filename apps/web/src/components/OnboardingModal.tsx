import { useThemePrefs } from "../theme/ThemeProvider";
import { Modal } from "./Modal";
import { requestNotificationPermission } from "../lib/notifications";

export function OnboardingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setPrefs } = useThemePrefs();

  async function finish() {
    await setPrefs({ onboardingCompleted: true });
    onClose();
  }

  async function enableNotifs() {
    await requestNotificationPermission();
  }

  return (
    <Modal open={open} onClose={onClose} title="Bienvenue sur MyLife">
      <div className="space-y-4 text-sm">
        <p>
          Configure ton <strong>profil</strong> dans les réglages (poids, taille, sommeil) pour des objectifs
          d’hydratation et d’activité adaptés.
        </p>
        <p>
          Tes données restent sur cet appareil — utilise <strong>Sauvegarde</strong> dans les paramètres pour
          exporter un fichier JSON.
        </p>
        <button
          type="button"
          onClick={() => void enableNotifs()}
          className="w-full rounded-xl border border-border py-2 text-sm font-medium hover:border-accent"
        >
          Activer les notifications du navigateur (rappels agenda)
        </button>
        <button
          type="button"
          onClick={() => void finish()}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-white active:scale-[0.99]"
        >
          C’est compris
        </button>
      </div>
    </Modal>
  );
}
