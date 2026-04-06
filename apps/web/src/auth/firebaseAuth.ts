import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { parseFirebaseEnv } from "@mylife/firebase";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

function envRecord(): Record<string, string | undefined> {
  return import.meta.env as unknown as Record<string, string | undefined>;
}

export function isFirebaseAuthConfigured(): boolean {
  return parseFirebaseEnv(envRecord()) !== null;
}

function getOrInitAuth(): Auth | null {
  const cfg = parseFirebaseEnv(envRecord());
  if (!cfg) return null;
  if (!app) {
    app = initializeApp(cfg);
    auth = getAuth(app);
  }
  return auth;
}

export function getFirebaseAuthInstance(): Auth | null {
  return getOrInitAuth();
}

export function getFirebaseApp(): FirebaseApp | null {
  getOrInitAuth();
  return app;
}

/** Firestore avec cache persistant (offline-first, multi-onglets). */
export function getFirebaseDb(): Firestore | null {
  if (!getOrInitAuth() || !app) return null;
  if (!firestore) {
    try {
      firestore = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      firestore = getFirestore(app);
    }
  }
  return firestore;
}

export async function signInWithGooglePopup(): Promise<
  { ok: true; user: User } | { ok: false; error: string; code?: string }
> {
  const a = getOrInitAuth();
  if (!a)
    return {
      ok: false,
      error:
        "Firebase n’est pas configuré. Ajoute les variables VITE_FIREBASE_* dans un fichier .env à la racine de apps/web.",
    };

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const cred = await signInWithPopup(a, provider);
    return { ok: true, user: cred.user };
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "auth/popup-closed-by-user") {
      return { ok: false, error: "Connexion annulée.", code: err.code };
    }
    if (err.code === "auth/popup-blocked") {
      return {
        ok: false,
        error: "La fenêtre de connexion a été bloquée. Autorise les pop-ups pour ce site.",
        code: err.code,
      };
    }
    return {
      ok: false,
      error: err.message ?? "Échec de la connexion Google.",
      code: err.code,
    };
  }
}

export async function signOutFirebaseUser(): Promise<void> {
  const a = getOrInitAuth();
  if (a?.currentUser) await signOut(a);
}

export function subscribeFirebaseAuth(
  onUser: (user: User | null) => void
): (() => void) | null {
  const a = getOrInitAuth();
  if (!a) return null;
  return onAuthStateChanged(a, onUser);
}
