import { useEffect, useRef, useState, type ReactNode } from "react";
import { useThemePrefs } from "../theme/ThemeProvider";
import { getProfile, saveProfile } from "../db";
import type { AppLanguage, UserProfile, ThemeId, ActivityLevel, Sex, DndPeriod } from "@mylife/core";
import { profileBmi } from "@mylife/core";
import { hashPin } from "../lib/pin";
import { useSessionStore } from "../auth/sessionStore";
import { signOutFirebaseUser } from "../auth/firebaseAuth";
import { defaultProfile } from "../defaults";
import { toast } from "../lib/toastStore";
import { exportDatabaseJson, importDatabaseJson } from "../lib/backup";
import { requestNotificationPermission } from "../lib/notifications";
import { registerLocalPasskey, isWebAuthnAvailable } from "../lib/webauthnLocal";
import { getCloudSyncHint } from "../lib/cloudSyncMeta";

export function SettingsPage() {
  const { prefs, setPrefs } = useThemePrefs();
  const signOut = useSessionStore((s) => s.signOut);
  const authMethod = useSessionStore((s) => s.authMethod);
  const sessionEmail = useSessionStore((s) => s.userEmail);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  /** Dernière version persistée — utilisée pour annuler l’édition */
  const [savedProfile, setSavedProfile] = useState<UserProfile>(defaultProfile);
  const [editingProfile, setEditingProfile] = useState(false);
  const [pinNew, setPinNew] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const importBackupRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getProfile().then((p) => {
      if (p) {
        setProfile(p);
        setSavedProfile(p);
      }
    });
  }, []);

  async function saveProfil(e?: React.FormEvent) {
    e?.preventDefault();
    await saveProfile(profile);
    setSavedProfile(profile);
    setEditingProfile(false);
    toast.ok("Profil enregistré — ta carte est à jour");
  }

  function cancelProfileEdit() {
    setProfile(savedProfile);
    setEditingProfile(false);
  }

  function openProfileEdit() {
    setProfile(savedProfile);
    setEditingProfile(true);
  }

  async function savePin() {
    if (pinNew.length < 4 || pinNew !== pinConfirm) {
      alert("PIN 4–6 chiffres et confirmation identique.");
      return;
    }
    const pinHash = await hashPin(pinNew);
    await setPrefs({ pinEnabled: true, pinHash });
    setPinNew("");
    setPinConfirm("");
    alert("PIN enregistré.");
  }

  async function clearPin() {
    await setPrefs({ pinEnabled: false, pinHash: undefined });
  }

  return (
    <div className="space-y-8 pb-8">
      <header>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted">Profil, thème, sécurité, notifications.</p>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-elevated p-4">
        <h2 className="font-semibold">Données & synchronisation</h2>
        <p className="text-sm text-muted leading-relaxed">{getCloudSyncHint()}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-accent active:scale-[0.99]"
            onClick={() =>
              void (async () => {
                const j = await exportDatabaseJson();
                const blob = new Blob([j], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `mylife-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
                toast.ok("Sauvegarde téléchargée");
              })()
            }
          >
            Exporter JSON
          </button>
          <button
            type="button"
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-[var(--red)] hover:border-[var(--red)] active:scale-[0.99]"
            onClick={() => importBackupRef.current?.click()}
          >
            Importer (remplace tout)
          </button>
          <input
            ref={importBackupRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) =>
              void (async () => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  const text = await f.text();
                  await importDatabaseJson(text);
                  toast.ok("Données importées — rechargement…");
                  window.setTimeout(() => window.location.reload(), 600);
                } catch {
                  toast.info("Import impossible — fichier invalide ?");
                }
              })()
            }
          />
        </div>
        <button
          type="button"
          className="w-full rounded-xl border border-border py-2 text-sm text-muted hover:border-accent hover:text-[var(--text)]"
          onClick={() =>
            void requestNotificationPermission().then((p) => {
              if (p === "granted") toast.ok("Notifications autorisées");
              else toast.info("Permission refusée ou indisponible");
            })
          }
        >
          Demander la permission notifications (navigateur)
        </button>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Profil</h2>
          {!editingProfile && (
            <button
              type="button"
              onClick={openProfileEdit}
              className="rounded-xl border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-accent active:scale-95"
            >
              Modifier
            </button>
          )}
        </div>

        {!editingProfile ? (
          <ProfileIdentityCard profile={savedProfile} onOpenEdit={openProfileEdit} />
        ) : (
          <form
            onSubmit={(e) => void saveProfil(e)}
            className="space-y-3 rounded-2xl border border-border bg-elevated p-4"
          >
            <p className="text-xs text-muted">
              Ajuste tes informations puis valide pour mettre à jour ta carte.
            </p>
            <label className="block text-xs text-muted">Prénom</label>
            <input
              className="w-full rounded-xl border border-border bg-surface px-3 py-2"
              value={profile.prenom}
              onChange={(e) => setProfile({ ...profile, prenom: e.target.value })}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Sexe">
                <select
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
                  value={profile.sexe}
                  onChange={(e) => setProfile({ ...profile, sexe: e.target.value as Sex })}
                >
                  <option value="homme">Homme</option>
                  <option value="femme">Femme</option>
                  <option value="autre">Autre</option>
                </select>
              </Field>
              <Field label="Âge">
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
                />
              </Field>
              <Field label="Poids (kg)">
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
                  value={profile.poidsKg}
                  onChange={(e) => setProfile({ ...profile, poidsKg: Number(e.target.value) })}
                />
              </Field>
              <Field label="Taille (cm)">
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
                  value={profile.tailleCm}
                  onChange={(e) => setProfile({ ...profile, tailleCm: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Activité habituelle">
              <select
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
                value={profile.activiteHabituelle}
                onChange={(e) =>
                  setProfile({ ...profile, activiteHabituelle: e.target.value as ActivityLevel })
                }
              >
                <option value="sedentaire">Sédentaire</option>
                <option value="modere">Modéré</option>
                <option value="intense">Intense</option>
              </select>
            </Field>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Lever">
                <input
                  type="time"
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
                  value={profile.heureLever}
                  onChange={(e) => setProfile({ ...profile, heureLever: e.target.value })}
                />
              </Field>
              <Field label="Coucher">
                <input
                  type="time"
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
                  value={profile.heureCoucher}
                  onChange={(e) => setProfile({ ...profile, heureCoucher: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row-reverse sm:gap-3">
              <button
                type="submit"
                className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white active:scale-[0.98] sm:flex-1"
              >
                Enregistrer et valider
              </button>
              <button
                type="button"
                onClick={cancelProfileEdit}
                className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted hover:text-[var(--text)] active:scale-[0.98] sm:flex-1"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-elevated p-4">
        <h2 className="font-semibold">Apparence</h2>
        <label className="text-xs text-muted">Langue</label>
        <select
          className="w-full rounded-xl border border-border bg-surface px-3 py-2"
          value={prefs.language ?? "fr"}
          onChange={(e) => void setPrefs({ language: e.target.value as AppLanguage })}
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
        <label className="text-xs text-muted">Nom de l’app</label>
        <input
          className="w-full rounded-xl border border-border bg-surface px-3 py-2"
          value={prefs.appDisplayName}
          onChange={(e) => void setPrefs({ appDisplayName: e.target.value })}
        />
        <label className="text-xs text-muted">Thème</label>
        <select
          className="w-full rounded-xl border border-border bg-surface px-3 py-2"
          value={prefs.theme}
          onChange={(e) => void setPrefs({ theme: e.target.value as ThemeId })}
        >
          <option value="dark">Sombre</option>
          <option value="light">Clair</option>
          <option value="amoled">AMOLED</option>
          <option value="custom">Personnalisé (accent)</option>
        </select>
        <label className="text-xs text-muted">Couleur d’accent</label>
        <input
          type="color"
          className="h-10 w-full cursor-pointer rounded-xl border border-border bg-surface"
          value={prefs.accentColor}
          onChange={(e) => void setPrefs({ accentColor: e.target.value })}
        />
        <label className="text-xs text-muted">Police</label>
        <select
          className="w-full rounded-xl border border-border bg-surface px-3 py-2"
          value={prefs.fontFamily}
          onChange={(e) =>
            void setPrefs({
              fontFamily: e.target.value as typeof prefs.fontFamily,
            })
          }
        >
          <option value="inter">Inter</option>
          <option value="source">Source Sans 3</option>
          <option value="atkinson">Atkinson Hyperlegible</option>
          <option value="system">Système</option>
        </select>
        <label className="text-xs text-muted">Taille du texte</label>
        <select
          className="w-full rounded-xl border border-border bg-surface px-3 py-2"
          value={prefs.textScale}
          onChange={(e) =>
            void setPrefs({ textScale: e.target.value as typeof prefs.textScale })
          }
        >
          <option value="petit">Petit</option>
          <option value="normal">Normal</option>
          <option value="grand">Grand</option>
        </select>
      </section>

      <NotifScheduleSection />

      <section className="space-y-3 rounded-2xl border border-border bg-elevated p-4">
        <h2 className="font-semibold">Sécurité</h2>
        <p className="text-sm text-muted">
          Compte :{" "}
          {authMethod === "google" && sessionEmail
            ? `Google (${sessionEmail})`
            : authMethod === "local"
              ? "Sans compte — données sur cet appareil"
              : "—"}
        </p>
        <p className="text-sm text-muted">
          PIN : {prefs.pinEnabled ? "activé" : "désactivé"}
          {" · "}
          Passkey :{" "}
          {!isWebAuthnAvailable()
            ? "navigateur incompatible"
            : prefs.webAuthnCredentialIds
              ? "configurée sur cet appareil"
              : "non configurée"}
        </p>
        <button
          type="button"
          disabled={!isWebAuthnAvailable()}
          className="w-full rounded-xl border border-border py-2 text-sm font-medium text-muted hover:border-accent hover:text-[var(--text)] disabled:opacity-40"
          onClick={() =>
            void (async () => {
              const id = await registerLocalPasskey();
              if (!id) {
                toast.info("Enregistrement annulé ou impossible.");
                return;
              }
              let ids: string[] = [];
              try {
                ids = prefs.webAuthnCredentialIds ? (JSON.parse(prefs.webAuthnCredentialIds) as string[]) : [];
              } catch {
                ids = [];
              }
              if (!Array.isArray(ids)) ids = [];
              ids.push(id);
              await setPrefs({ webAuthnCredentialIds: JSON.stringify(ids), biometricEnabled: true });
              toast.ok("Passkey ajoutée — déverrouillage biométrique disponible.");
            })()
          }
        >
          Ajouter une passkey (déverrouillage)
        </button>
        <input
          type="password"
          inputMode="numeric"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2"
          placeholder="Nouveau PIN"
          value={pinNew}
          onChange={(e) => setPinNew(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
        <input
          type="password"
          inputMode="numeric"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2"
          placeholder="Confirmer PIN"
          value={pinConfirm}
          onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl bg-accent py-2 text-white"
            onClick={() => void savePin()}
          >
            Enregistrer PIN
          </button>
          <button
            type="button"
            className="rounded-xl border border-border px-4 py-2"
            onClick={() => void clearPin()}
          >
            Retirer
          </button>
        </div>
        <label className="flex items-center justify-between text-sm">
          Verrouillage auto
          <select
            className="rounded-lg border border-border bg-surface px-2 py-1"
            value={prefs.lockTimeoutMin}
            onChange={(e) =>
              void setPrefs({ lockTimeoutMin: Number(e.target.value) as 0 | 1 | 5 })
            }
          >
            <option value={0}>Immédiat</option>
            <option value={1}>1 min</option>
            <option value={5}>5 min</option>
          </select>
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-elevated p-4">
        <h2 className="font-semibold">Compte</h2>
        <button
          type="button"
          className="mt-2 w-full rounded-xl border border-red-500/50 py-2 text-red-400"
          onClick={() => {
            if (!confirm("Déconnexion ?")) return;
            void (async () => {
              if (useSessionStore.getState().authMethod === "google") {
                await signOutFirebaseUser();
              }
              signOut();
            })();
          }}
        >
          Déconnexion
        </button>
      </section>
    </div>
  );
}

const SEXE_LABEL: Record<Sex, string> = { homme: "Homme", femme: "Femme", autre: "Autre" };
const ACTIVITE_LABEL: Record<ActivityLevel, string> = {
  sedentaire: "Sédentaire",
  modere: "Modéré",
  intense: "Intense",
};

/** Carte d’identité du profil — clic pour ouvrir l’édition */
function ProfileIdentityCard({
  profile,
  onOpenEdit,
}: {
  profile: UserProfile;
  onOpenEdit: () => void;
}) {
  const initial = profile.prenom?.trim()?.charAt(0)?.toUpperCase() || "?";
  const bmi = Math.round(profileBmi(profile) * 10) / 10;

  return (
    <button
      type="button"
      onClick={onOpenEdit}
      className="group w-full rounded-2xl border-2 border-accent/30 bg-gradient-to-br from-accent/20 via-[var(--elevated)] to-[var(--surface)] p-[3px] text-left shadow-lg shadow-black/20 transition hover:border-accent/55 hover:shadow-accent/15 active:scale-[0.99]"
      aria-label="Modifier le profil"
    >
      <div className="relative overflow-hidden rounded-[0.9rem] border border-border bg-[var(--elevated)] px-4 pb-4 pt-5">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent/10"
          aria-hidden
        />
        <div className="absolute right-3 top-3 rounded-full border border-border/80 bg-[var(--surface)] px-2 py-0.5 text-[0.65rem] font-medium text-muted group-hover:border-accent/40 group-hover:text-accent">
          Modifier
        </div>

        <div className="flex gap-4">
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt=""
              className="h-20 w-20 shrink-0 rounded-2xl border-2 border-accent/40 object-cover shadow-md"
            />
          ) : (
            <div
              className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-2 border-accent/50 bg-accent/20 text-3xl font-bold text-accent shadow-inner"
              aria-hidden
            >
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">Profil</p>
            <p className="truncate text-xl font-bold leading-tight">{profile.prenom || "—"}</p>
            <p className="mt-1 text-xs text-muted opacity-80 group-hover:opacity-100">
              Touche la carte pour modifier tes infos
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-3">
          <IdentityChip label="Âge" value={`${profile.age} ans`} />
          <IdentityChip label="Sexe" value={SEXE_LABEL[profile.sexe]} />
          <IdentityChip label="Poids" value={`${profile.poidsKg} kg`} />
          <IdentityChip label="Taille" value={`${profile.tailleCm} cm`} />
          <IdentityChip label="IMC" value={`${bmi}`} />
          <IdentityChip label="Activité" value={ACTIVITE_LABEL[profile.activiteHabituelle]} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-[var(--surface)] px-3 py-2.5 text-xs">
          <span className="text-muted">Rythme</span>
          <span className="font-medium">
            {profile.heureLever} → {profile.heureCoucher}
          </span>
          <span className="text-muted">(lever — coucher)</span>
        </div>
      </div>
    </button>
  );
}

function IdentityChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-[var(--surface)] px-2.5 py-2">
      <p className="text-[0.65rem] uppercase tracking-wide text-muted">{label}</p>
      <p className="truncate font-semibold">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Section Notifications : plage horaire active + périodes NePasRanger
══════════════════════════════════════════════════════════════════════════ */
function NotifScheduleSection() {
  const { prefs, setPrefs } = useThemePrefs();

  /* Valeurs avec fallbacks pour les anciens comptes sans ces champs */
  const windowStart = prefs.notifWindowStart ?? "07:00";
  const windowEnd   = prefs.notifWindowEnd   ?? "22:00";
  const dndPeriods  = prefs.dndPeriods       ?? [];

  /* Formulaire d'ajout de période DND */
  const [adding, setAdding]         = useState(false);
  const [newLabel, setNewLabel]     = useState("");
  const [newStart, setNewStart]     = useState("12:00");
  const [newEnd, setNewEnd]         = useState("14:00");

  function timeToMin(t: string) {
    const [h, m] = t.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  }

  /* Ajouter une période DND */
  async function addDnd(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const period: DndPeriod = {
      id: crypto.randomUUID(),
      label: newLabel.trim(),
      start: newStart,
      end: newEnd,
      enabled: true,
    };
    await setPrefs({ dndPeriods: [...dndPeriods, period] });
    setNewLabel("");
    setAdding(false);
    toast.ok(`Période « ${period.label} » ajoutée`);
  }

  /* Basculer une période on/off */
  async function toggleDnd(id: string) {
    await setPrefs({
      dndPeriods: dndPeriods.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p
      ),
    });
  }

  /* Supprimer une période */
  async function removeDnd(id: string) {
    await setPrefs({ dndPeriods: dndPeriods.filter((p) => p.id !== id) });
    toast.info("Période supprimée");
  }

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-elevated p-4">
      <h2 className="font-semibold">Notifications</h2>

      {/* ── 1. Types de notifications ── */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted">Par module</p>
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {([
            ["notifHydration", "💧", "Hydratation"],
            ["notifHabits",    "✅", "Habitudes"],
            ["notifAgenda",    "📅", "Agenda"],
            ["notifSport",     "🏃", "Sport"],
            ["notifFinance",   "💶", "Finances"],
            ["notifGoals",     "🎯", "Objectifs"],
          ] as const).map(([key, ico, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-3 bg-[var(--surface)] px-3 py-2.5 hover:bg-elevated/60"
            >
              <span className="text-base">{ico}</span>
              <span className="flex-1 text-sm">{label}</span>
              <Toggle
                checked={prefs[key]}
                onChange={(v) => void setPrefs({ [key]: v })}
              />
            </label>
          ))}
        </div>
      </div>

      {/* ── 2. Plage horaire active ── */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted">Plage horaire active</p>
        <p className="text-xs text-muted">
          Les notifications ne s'enverront que dans cette fenêtre.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Début">
            <input
              type="time"
              className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm"
              value={windowStart}
              onChange={(e) => void setPrefs({ notifWindowStart: e.target.value })}
            />
          </Field>
          <Field label="Fin">
            <input
              type="time"
              className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm"
              value={windowEnd}
              onChange={(e) => void setPrefs({ notifWindowEnd: e.target.value })}
            />
          </Field>
        </div>

        {/* Timeline 24 h */}
        <NotifTimeline
          windowStart={windowStart}
          windowEnd={windowEnd}
          dndPeriods={dndPeriods}
          timeToMin={timeToMin}
        />

        {/* Légende */}
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-4 rounded-sm bg-accent/40" /> Actif
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-4 rounded-sm bg-[var(--surface)]" /> Inactif
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-4 rounded-sm bg-red-500/40" /> Ne Pas Déranger
          </span>
        </div>
      </div>

      {/* ── 3. Périodes Ne Pas Déranger ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted">Ne Pas Déranger</p>
          <button
            type="button"
            onClick={() => setAdding((x) => !x)}
            className="rounded-lg border border-border bg-[var(--surface)] px-2.5 py-1 text-xs hover:border-accent hover:text-accent active:scale-95"
          >
            {adding ? "Annuler" : "+ Ajouter"}
          </button>
        </div>

        {/* Formulaire d'ajout */}
        {adding && (
          <form
            onSubmit={addDnd}
            className="space-y-2 rounded-xl border border-border bg-[var(--surface)] p-3"
          >
            <input
              autoFocus
              required
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="Nom de la période (ex. Réunion, Repas, Sieste…)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-xs text-muted">De</p>
                <input
                  type="time"
                  className="w-full rounded-lg border border-border bg-elevated px-2 py-1.5 text-sm"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
              </div>
              <div>
                <p className="mb-1 text-xs text-muted">À</p>
                <input
                  type="time"
                  className="w-full rounded-lg border border-border bg-elevated px-2 py-1.5 text-sm"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-white active:scale-95"
            >
              Enregistrer
            </button>
          </form>
        )}

        {/* Liste des périodes */}
        {dndPeriods.length === 0 && !adding && (
          <p className="rounded-xl border border-dashed border-border py-4 text-center text-xs text-muted">
            Aucune période — ajoutes-en une pour bloquer les notifications.
          </p>
        )}

        <div className="space-y-1.5">
          {dndPeriods.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                p.enabled
                  ? "border-red-500/25 bg-red-500/8"
                  : "border-border bg-[var(--surface)] opacity-60"
              }`}
            >
              {/* Icône état */}
              <span className="text-base">{p.enabled ? "🔕" : "🔔"}</span>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{p.label}</p>
                <p className="text-xs text-muted">
                  {p.start} → {p.end}
                  {timeToMin(p.end) < timeToMin(p.start) && (
                    <span className="ml-1 opacity-60">(passe minuit)</span>
                  )}
                </p>
              </div>

              {/* Toggle */}
              <Toggle checked={p.enabled} onChange={() => void toggleDnd(p.id)} />

              {/* Supprimer */}
              <button
                type="button"
                onClick={() => void removeDnd(p.id)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted hover:text-[var(--red)]"
                aria-label="Supprimer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Timeline 24 h ── */
function NotifTimeline({
  windowStart,
  windowEnd,
  dndPeriods,
  timeToMin,
}: {
  windowStart: string;
  windowEnd: string;
  dndPeriods: DndPeriod[];
  timeToMin: (t: string) => number;
}) {
  const total = 24 * 60;

  function pct(min: number) {
    return `${(min / total) * 100}%`;
  }

  /* Zones "actives" — gère le cas où la fenêtre passe minuit */
  const wsMin = timeToMin(windowStart);
  const weMin = timeToMin(windowEnd);
  const activeZones =
    weMin > wsMin
      ? [{ left: wsMin, width: weMin - wsMin }]
      : [
          { left: 0,     width: weMin },
          { left: wsMin, width: total - wsMin },
        ];

  return (
    <div className="relative h-9 overflow-hidden rounded-xl bg-[var(--surface)]">
      {/* Zones actives */}
      {activeZones.map((z, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 bg-accent/30"
          style={{ left: pct(z.left), width: pct(z.width) }}
        />
      ))}

      {/* Zones DND (par-dessus les zones actives) */}
      {dndPeriods
        .filter((p) => p.enabled)
        .map((p) => {
          const s = timeToMin(p.start);
          const e = timeToMin(p.end);
          const zones =
            e > s
              ? [{ left: s, width: e - s }]
              : [{ left: 0, width: e }, { left: s, width: total - s }];
          return zones.map((z, i) => (
            <div
              key={`${p.id}-${i}`}
              className="absolute top-0 bottom-0 bg-red-500/35"
              style={{ left: pct(z.left), width: pct(z.width) }}
            />
          ));
        })}

      {/* Repères horaires */}
      {[0, 6, 12, 18].map((h) => (
        <div
          key={h}
          className="absolute top-0 bottom-0 flex flex-col justify-end"
          style={{ left: pct(h * 60) }}
        >
          <div className="w-px flex-1 bg-border/40" />
          <span
            className="px-0.5 pb-0.5 leading-none text-muted"
            style={{ fontSize: "0.55rem" }}
          >
            {h === 0 ? "0h" : `${h}h`}
          </span>
        </div>
      ))}

      {/* Marqueur "maintenant" */}
      <NowMarker pct={pct} />
    </div>
  );
}

/* Pointeur "maintenant" sur la timeline */
function NowMarker({ pct }: { pct: (m: number) => string }) {
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-white/60"
      style={{ left: pct(nowMin) }}
      title={`Maintenant — ${String(Math.floor(nowMin / 60)).padStart(2, "0")}:${String(nowMin % 60).padStart(2, "0")}`}
    >
      <div className="absolute -left-1 top-0 h-2 w-2 rounded-full bg-white/80" />
    </div>
  );
}

/* Interrupteur : pouce ancré à gauche (évite position « inversée » et débordement) */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors duration-200 ${
        checked ? "bg-accent" : "bg-border"
      }`}
    >
      <span
        className={`pointer-events-none absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform duration-200 ease-out ${
          checked ? "translate-x-[1.25rem]" : "translate-x-0"
        }`}
      />
    </button>
  );
}
