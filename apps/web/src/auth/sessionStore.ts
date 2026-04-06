import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthMethod = "local" | "google";

type SessionState = {
  /** Indique si l’utilisateur peut accéder à l’app (nom historique conservé pour la persistance) */
  googleSignedIn: boolean;
  authMethod: AuthMethod | null;
  userEmail: string | null;
  /** UID Firebase Auth (sync Firestore) */
  firebaseUid: string | null;
  unlocked: boolean;
  lastActivity: number;
  signInLocal: () => void;
  signInGoogle: (email: string, uid: string) => void;
  /** Synchronisation avec Firebase Auth (rechargement de page, autre onglet) */
  syncFirebaseUser: (email: string | null, uid?: string | null) => void;
  signOut: () => void;
  setUnlocked: (v: boolean) => void;
  touch: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      googleSignedIn: false,
      authMethod: null,
      userEmail: null,
      firebaseUid: null,
      unlocked: true,
      lastActivity: Date.now(),

      signInLocal: () =>
        set({
          googleSignedIn: true,
          authMethod: "local",
          userEmail: "demo@mylife.app",
          firebaseUid: null,
          unlocked: true,
          lastActivity: Date.now(),
        }),

      signInGoogle: (email: string, uid: string) =>
        set({
          googleSignedIn: true,
          authMethod: "google",
          userEmail: email,
          firebaseUid: uid,
          unlocked: true,
          lastActivity: Date.now(),
        }),

      syncFirebaseUser: (email, uid = null) => {
        if (email && uid) {
          set({
            googleSignedIn: true,
            authMethod: "google",
            userEmail: email,
            firebaseUid: uid,
            lastActivity: Date.now(),
          });
          return;
        }
        /* Déconnexion Firebase : ne pas expulser une session « sans compte » locale */
        if (get().authMethod === "google") {
          set({
            googleSignedIn: false,
            authMethod: null,
            userEmail: null,
            firebaseUid: null,
            lastActivity: Date.now(),
          });
        }
      },

      signOut: () =>
        set({
          googleSignedIn: false,
          authMethod: null,
          userEmail: null,
          firebaseUid: null,
          unlocked: true,
          lastActivity: Date.now(),
        }),

      setUnlocked: (v) => set({ unlocked: v }),
      touch: () => set({ lastActivity: Date.now() }),
    }),
    {
      name: "mylife-session",
      /* Ancien état sans authMethod : considérer comme session locale */
      merge: (persisted, current) => {
        const p = persisted as Partial<SessionState> | undefined;
        if (!p) return current;
        return {
          ...current,
          ...p,
          firebaseUid: p.firebaseUid ?? current.firebaseUid,
          authMethod:
            p.authMethod ??
            (p.googleSignedIn ? ("local" as const) : null),
        };
      },
    }
  )
);
