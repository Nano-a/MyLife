import { useEffect } from "react";
import { subscribeFirebaseAuth } from "./firebaseAuth";
import { useSessionStore } from "./sessionStore";

/** Écoute Firebase Auth pour garder la session alignée (rechargement, autre onglet). */
export function FirebaseAuthSync() {
  const syncFirebaseUser = useSessionStore((s) => s.syncFirebaseUser);

  useEffect(() => {
    const unsub = subscribeFirebaseAuth((user) => {
      syncFirebaseUser(user?.email ?? null);
    });
    return () => {
      unsub?.();
    };
  }, [syncFirebaseUser]);

  return null;
}
