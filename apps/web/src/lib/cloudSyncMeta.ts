/**
 * Couche minimale « cloud » : enregistre un horodatage si l’utilisateur est connecté (Google).
 * Une vraie sync Firestore des tables Dexie reste à brancher (delta, conflits).
 */
import { useSessionStore } from "../auth/sessionStore";

export function getCloudSyncHint(): string {
  const m = useSessionStore.getState().authMethod;
  if (m === "google") {
    return "Compte Google actif — la synchronisation complète des données (Dexie → Firestore) peut être activée ultérieurement.";
  }
  return "Sans compte : tout est stocké sur cet appareil uniquement.";
}
