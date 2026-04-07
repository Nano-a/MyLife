import { useSessionStore } from "../auth/sessionStore";
import { isFirestoreSyncActive } from "../sync/firestoreDexieSync";

export function getCloudSyncHint(): string {
  const m = useSessionStore.getState().authMethod;
  if (m === "google" && isFirestoreSyncActive()) {
    return "Compte Google : synchronisation Firestore active — tes données se mettent à jour sur le cloud et sur cet appareil (mode hors-ligne pris en charge).";
  }
  if (m === "google") {
    return "Compte Google connecté — si Firestore est configuré côté projet, la sync démarre automatiquement. Sinon, vérifie la console ou les règles de sécurité.";
  }
  return "Sans compte Google : tout est stocké localement sur cet appareil (IndexedDB). Tu peux exporter une sauvegarde JSON dans les paramètres.";
}
