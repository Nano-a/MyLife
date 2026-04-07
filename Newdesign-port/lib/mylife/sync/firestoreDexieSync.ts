/**
 * Synchronisation bidirectionnelle Dexie ↔ Firestore (spec : users/{uid}/…).
 * Offline-first : Firestore persistence + écriture locale immédiate, push au cloud en arrière-plan.
 */
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "../auth/firebaseAuth";
import { db } from "../db";

const COLLECTIONS = [
  "habits",
  "habitCompletions",
  "events",
  "sportSessions",
  "sportTemplates",
  "transactions",
  "balanceSnapshots",
  "budgets",
  "subscriptions",
  "objectives",
  "noteFolders",
  "notes",
  "hydrationDays",
  "moodDays",
] as const;

type Coll = (typeof COLLECTIONS)[number];

let activeUid: string | null = null;
let unsubs: Unsubscribe[] = [];
let remoteDepth = 0;
const lastRemoteModified = new Map<string, number>();

function remoteKey(coll: string, id: string) {
  return `${coll}/${id}`;
}

function isApplyingRemote() {
  return remoteDepth > 0;
}

function stripMeta(data: Record<string, unknown>) {
  const { _modified: _, ...rest } = data;
  return rest;
}

async function applyFirestoreDoc(coll: Coll, id: string, data: Record<string, unknown> | undefined) {
  const mod = typeof data?._modified === "number" ? data._modified : 0;
  const rk = remoteKey(coll, id);
  if (mod <= (lastRemoteModified.get(rk) ?? 0)) return;
  lastRemoteModified.set(rk, mod);

  const table = db.table(coll);
  const clean = stripMeta(data ?? {});
  remoteDepth++;
  try {
    if (Object.keys(clean).length === 0) {
      await table.delete(id);
    } else {
      await table.put(clean);
    }
  } finally {
    remoteDepth--;
  }
}

async function applySettingsDoc(key: string, data: Record<string, unknown> | undefined) {
  const mod = typeof data?._modified === "number" ? data._modified : 0;
  const rk = remoteKey("settings", key);
  if (mod <= (lastRemoteModified.get(rk) ?? 0)) return;
  lastRemoteModified.set(rk, mod);
  const payload = data?.payload;
  remoteDepth++;
  try {
    if (payload === undefined) await db.settings.delete(key);
    else await db.settings.put({ key, value: payload });
  } finally {
    remoteDepth--;
  }
}

async function removeFirestoreDoc(coll: Coll, id: string) {
  lastRemoteModified.delete(remoteKey(coll, id));
  remoteDepth++;
  try {
    await db.table(coll).delete(id);
  } finally {
    remoteDepth--;
  }
}

export function isFirestoreSyncActive(): boolean {
  return activeUid != null;
}

async function pushRow(coll: Coll, id: string, row: unknown) {
  const fs = getFirebaseDb();
  if (!fs || !activeUid || isApplyingRemote()) return;
  const modified = Date.now();
  lastRemoteModified.set(remoteKey(coll, id), modified);
  const payload = JSON.parse(JSON.stringify(row)) as Record<string, unknown>;
  await setDoc(doc(fs, "users", activeUid, coll, id), {
    ...payload,
    _modified: modified,
  });
}

async function pushDelete(coll: Coll, id: string) {
  const fs = getFirebaseDb();
  if (!fs || !activeUid || isApplyingRemote()) return;
  lastRemoteModified.delete(remoteKey(coll, id));
  await deleteDoc(doc(fs, "users", activeUid, coll, id));
}

async function pushSettings(key: string, value: unknown) {
  const fs = getFirebaseDb();
  if (!fs || !activeUid || isApplyingRemote()) return;
  const modified = Date.now();
  lastRemoteModified.set(remoteKey("settings", key), modified);
  await setDoc(doc(fs, "users", activeUid, "settings", key), {
    payload: value,
    _modified: modified,
  });
}

async function pushSettingsDelete(key: string) {
  const fs = getFirebaseDb();
  if (!fs || !activeUid || isApplyingRemote()) return;
  lastRemoteModified.delete(remoteKey("settings", key));
  await deleteDoc(doc(fs, "users", activeUid, "settings", key));
}

const hooksAttached = new Set<string>();

function attachTableHooks(coll: Coll) {
  if (hooksAttached.has(coll)) return;
  hooksAttached.add(coll);
  const tbl = db.table(coll);

  tbl.hook("creating", (pk, obj, trans) => {
    trans.on("complete", () => {
      void pushRow(coll, String(pk), obj);
    });
  });

  tbl.hook("updating", (_mods, pk, _obj, trans) => {
    trans.on("complete", () => {
      void (async () => {
        const row = await tbl.get(pk);
        if (row) void pushRow(coll, String(pk), row);
      })();
    });
  });

  tbl.hook("deleting", (pk, _obj, trans) => {
    trans.on("complete", () => {
      void pushDelete(coll, String(pk));
    });
  });
}

function attachSettingsHooks() {
  const k = "settings_hooks";
  if (hooksAttached.has(k)) return;
  hooksAttached.add(k);

  db.settings.hook("creating", (pk, obj, trans) => {
    trans.on("complete", () => {
      void pushSettings(String(pk), (obj as { value?: unknown }).value);
    });
  });

  db.settings.hook("updating", (_m, pk, _obj, trans) => {
    trans.on("complete", () => {
      void (async () => {
        const row = await db.settings.get(String(pk));
        if (row) void pushSettings(row.key, row.value);
      })();
    });
  });

  db.settings.hook("deleting", (pk, _obj, trans) => {
    trans.on("complete", () => {
      void pushSettingsDelete(String(pk));
    });
  });
}

/** Démarre les listeners + hooks (appeler avec l’uid Firebase Auth). */
export function startFirestoreDexieSync(uid: string): void {
  stopFirestoreDexieSync();
  const fs = getFirebaseDb();
  if (!fs) return;
  activeUid = uid;

  for (const coll of COLLECTIONS) {
    attachTableHooks(coll);
    const ref = collection(fs, "users", uid, coll);
    const unsub = onSnapshot(ref, (snap) => {
      for (const ch of snap.docChanges()) {
        const id = ch.doc.id;
        if (ch.type === "removed") void removeFirestoreDoc(coll, id);
        else void applyFirestoreDoc(coll, id, ch.doc.data() as Record<string, unknown>);
      }
    });
    unsubs.push(unsub);
  }

  attachSettingsHooks();
  const setRef = collection(fs, "users", uid, "settings");
  const unsubSet = onSnapshot(setRef, (snap) => {
    for (const ch of snap.docChanges()) {
      const id = ch.doc.id;
      if (ch.type === "removed") {
        remoteDepth++;
        void db.settings
          .delete(id)
          .finally(() => {
            remoteDepth--;
          });
      } else {
        void applySettingsDoc(id, ch.doc.data() as Record<string, unknown>);
      }
    }
  });
  unsubs.push(unsubSet);
}

export function stopFirestoreDexieSync(): void {
  for (const u of unsubs) u();
  unsubs = [];
  activeUid = null;
  lastRemoteModified.clear();
}
