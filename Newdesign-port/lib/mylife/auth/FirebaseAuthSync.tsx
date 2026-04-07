import { useEffect } from "react";
import { subscribeFirebaseAuth } from "./firebaseAuth";
import { useSessionStore } from "./sessionStore";
import { startFirestoreDexieSync, stopFirestoreDexieSync } from "../sync/firestoreDexieSync";

/** Écoute Firebase Auth + démarre la sync Firestore ↔ Dexie pour les comptes Google. */
export function FirebaseAuthSync() {
  const syncFirebaseUser = useSessionStore((s) => s.syncFirebaseUser);

  useEffect(() => {
    const unsub = subscribeFirebaseAuth((user) => {
      if (user?.email && user.uid) {
        syncFirebaseUser(user.email, user.uid);
        startFirestoreDexieSync(user.uid);
      } else {
        stopFirestoreDexieSync();
        if (useSessionStore.getState().authMethod === "google") {
          syncFirebaseUser(null);
        }
      }
    });
    return () => {
      unsub?.();
      stopFirestoreDexieSync();
    };
  }, [syncFirebaseUser]);

  return null;
}
