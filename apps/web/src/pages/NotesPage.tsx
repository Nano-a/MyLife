import { useLiveQuery } from "dexie-react-hooks";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { db } from "../db";
import type { NoteFolder, RichNote, RichNoteAttachment } from "@mylife/core";
import { Modal } from "../components/Modal";
import { toast } from "../lib/toastStore";

/* ═══════════════════════════════════ Palettes ════════════════════════════ */
const NOTE_COLORS = [
  { label: "Défaut",   value: "#18181f" },
  { label: "Ardoise",  value: "#1e293b" },
  { label: "Prune",    value: "#2d1b4e" },
  { label: "Marine",   value: "#0f2a3f" },
  { label: "Forêt",    value: "#0f2e1a" },
  { label: "Bordeaux", value: "#2d0f1a" },
  { label: "Sable",    value: "#2a2010" },
  { label: "Pêche",    value: "#ff9f7f" },
  { label: "Lavande",  value: "#b794f4" },
  { label: "Menthe",   value: "#68d391" },
  { label: "Ciel",     value: "#63b3ed" },
  { label: "Soleil",   value: "#f6e05e" },
] as const;

/* Couleurs tintées style macOS pour les dossiers */
const FOLDER_TINTS = [
  { label: "Bleu",    value: "#3b82f6" },
  { label: "Indigo",  value: "#6366f1" },
  { label: "Violet",  value: "#8b5cf6" },
  { label: "Rose",    value: "#ec4899" },
  { label: "Rouge",   value: "#ef4444" },
  { label: "Orange",  value: "#f97316" },
  { label: "Jaune",   value: "#eab308" },
  { label: "Vert",    value: "#22c55e" },
  { label: "Cyan",    value: "#06b6d4" },
  { label: "Ardoise", value: "#64748b" },
];

type Screen = "grid" | "editor";

/* ═══════════════════════════════════ Page principale ═════════════════════ */
export function NotesPage() {
  const allFolders = useLiveQuery(() => db.noteFolders.orderBy("createdAt").toArray(), []) ?? [];
  const allNotes   = useLiveQuery(() => db.notes.orderBy("updatedAt").reverse().toArray(), []) ?? [];

  /* Stack de navigation (breadcrumb) */
  const [folderPath, setFolderPath] = useState<{ id: string; nom: string }[]>([]);
  const currentFolderId = folderPath.length > 0 ? folderPath[folderPath.length - 1]!.id : null;

  const [search, setSearch]               = useState("");
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [screen, setScreen]               = useState<Screen>("grid");
  const [folderModalOpen, setFolderModalOpen] = useState(false);

  /* Sous-dossiers au niveau courant */
  const currentFolders = useMemo(
    () => allFolders.filter((f) =>
      currentFolderId ? f.parentId === currentFolderId : !f.parentId
    ),
    [allFolders, currentFolderId]
  );

  /* Notes au niveau courant — ou résultats de recherche globale */
  const displayedNotes = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return allNotes.filter(
        (n) =>
          n.titre.toLowerCase().includes(q) ||
          n.contenu.toLowerCase().includes(q) ||
          n.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    const list = allNotes.filter((n) =>
      currentFolderId ? n.dossierId === currentFolderId : !n.dossierId
    );
    return [...list.filter((n) => n.epingle), ...list.filter((n) => !n.epingle)];
  }, [allNotes, currentFolderId, search]);

  const activeNote = allNotes.find((n) => n.id === activeId) ?? null;

  /* ── Navigation dossiers ── */
  function navigateInto(folder: NoteFolder) {
    setFolderPath([...folderPath, { id: folder.id, nom: folder.nom }]);
    setSearch("");
  }

  function navigateTo(idx: number) {
    if (idx < 0) setFolderPath([]);
    else setFolderPath(folderPath.slice(0, idx + 1));
  }

  /* ── CRUD notes ── */
  function openNote(id: string) {
    setActiveId(id);
    setScreen("editor");
  }

  async function createNote() {
    const id = crypto.randomUUID();
    await db.notes.add({
      id,
      titre: "Nouvelle note",
      contenu: "<p></p>",
      dossierId: currentFolderId ?? undefined,
      bgColor: "#18181f",
      tags: [],
      epingle: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    toast.ok("Note créée");
    openNote(id);
  }

  async function deleteNote(note: RichNote) {
    if (!confirm(`Supprimer « ${note.titre} » ?`)) return;
    await db.notes.delete(note.id);
    if (activeId === note.id) { setActiveId(null); setScreen("grid"); }
    toast.info("Note supprimée");
  }

  async function duplicateNote(note: RichNote) {
    const id = crypto.randomUUID();
    await db.notes.add({
      ...note,
      id,
      titre: `${note.titre} (copie)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    toast.ok("Note dupliquée");
  }

  /* ── Vue éditeur ── */
  if (screen === "editor" && activeNote) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setScreen("grid")}
          className="flex items-center gap-2 self-start text-sm text-muted hover:text-[var(--text)]"
        >
          ← Retour aux notes
        </button>
        <NoteEditor
          note={activeNote}
          folders={allFolders}
          onDelete={() => void deleteNote(activeNote)}
        />
      </div>
    );
  }

  const isEmpty = !search && currentFolders.length === 0 && displayedNotes.length === 0;

  /* ── Vue grille (explorateur) ── */
  return (
    <div className="space-y-3">
      <p className="text-center text-[0.65rem] leading-snug text-muted">
        Données locales — tout est enregistré sur cet appareil.
      </p>

      {/* ── Barre de recherche proéminente ── */}
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted">
          🔍
        </span>
        <input
          className="w-full rounded-2xl elevated-surface py-3.5 pl-12 pr-10 text-sm outline-none transition-shadow focus:border-accent focus:shadow-float"
          placeholder="Rechercher dans les notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full bg-[var(--surface)] text-xs text-muted hover:text-[var(--text)]"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Breadcrumb + actions ── */}
      <div className="flex items-center gap-2">
        {/* Fil d'ariane */}
        <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => navigateTo(-1)}
            className={`shrink-0 rounded-lg px-2 py-1 transition-colors ${
              folderPath.length === 0
                ? "font-semibold text-[var(--text)]"
                : "text-muted hover:text-[var(--text)]"
            }`}
          >
            Notes
          </button>
          {folderPath.map((seg, i) => (
            <span key={seg.id} className="flex shrink-0 items-center gap-0.5">
              <span className="text-muted/50 select-none">/</span>
              <button
                type="button"
                onClick={() => navigateTo(i)}
                className={`rounded-lg px-2 py-1 transition-colors ${
                  i === folderPath.length - 1
                    ? "font-semibold text-[var(--text)]"
                    : "text-muted hover:text-[var(--text)]"
                }`}
              >
                {seg.nom}
              </button>
            </span>
          ))}
        </nav>

        {/* Nouveau dossier */}
        <button
          type="button"
          onClick={() => setFolderModalOpen(true)}
          className="shrink-0 grid h-8 w-8 place-items-center rounded-xl elevated-surface text-sm text-muted hover:text-[var(--text)] active:scale-90"
          title="Nouveau dossier"
          aria-label="Nouveau dossier"
        >
          📁
        </button>

        {/* Nouvelle note */}
        <button
          type="button"
          onClick={() => void createNote()}
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-base font-bold text-white shadow-md shadow-accent/30 hover:opacity-90 active:scale-90"
          aria-label="Nouvelle note"
        >
          +
        </button>
      </div>

      {/* ── Résultats de recherche ── */}
      {search && (
        <p className="text-xs text-muted">
          {displayedNotes.length > 0
            ? `${displayedNotes.length} résultat${displayedNotes.length !== 1 ? "s" : ""} pour « ${search} »`
            : `Aucun résultat pour « ${search} »`}
        </p>
      )}

      {/* ── État vide ── */}
      {isEmpty && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-4xl">{currentFolderId ? "📂" : "📓"}</p>
          <p className="mt-3 font-medium">
            {currentFolderId ? "Dossier vide" : "Aucune note"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {currentFolderId
              ? "Crée une note ou un sous-dossier ici."
              : "Appuie sur + pour créer ta première note."}
          </p>
        </div>
      )}

      {/* ── Grille dossiers style explorateur ── */}
      {!search && currentFolders.length > 0 && (
        <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4">
          {currentFolders.map((f) => {
            const notesIn     = allNotes.filter((n) => n.dossierId === f.id);
            const subsIn      = allFolders.filter((sub) => sub.parentId === f.id);
            return (
              <FolderCard
                key={f.id}
                folder={f}
                notes={notesIn}
                subfolders={subsIn}
                onOpen={() => navigateInto(f)}
                onDelete={async () => {
                  if (!confirm(`Supprimer « ${f.nom} » ? (les notes restent accessibles depuis la racine)`)) return;
                  await db.noteFolders.delete(f.id);
                  await db.notes.where("dossierId").equals(f.id).modify({ dossierId: undefined });
                  toast.info("Dossier supprimé");
                }}
              />
            );
          })}
        </div>
      )}

      {/* ── Grille notes masonry ── */}
      {displayedNotes.length > 0 && (
        <div style={{ columns: "2 160px", columnGap: "12px" }}>
          {displayedNotes.map((n) => (
            <div key={n.id} style={{ breakInside: "avoid", marginBottom: "12px" }}>
              <NoteCard
                note={n}
                onClick={() => openNote(n.id)}
                onDelete={() => void deleteNote(n)}
                onDuplicate={() => void duplicateNote(n)}
                onPin={() =>
                  void db.notes.update(n.id, { epingle: !n.epingle, updatedAt: Date.now() })
                }
              />
            </div>
          ))}
        </div>
      )}

      {displayedNotes.length > 0 && !search && (
        <p className="pb-2 text-center text-xs text-muted">
          {displayedNotes.length} note{displayedNotes.length !== 1 ? "s" : ""}
        </p>
      )}

      <CreateFolderModal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        parentId={currentFolderId ?? undefined}
      />
    </div>
  );
}

/* ═══════════════════════════════════ Icône dossier SVG (style macOS) ═════ */
function FolderIconSvg({
  color,
  noteCount,
  subfolderCount,
}: {
  color: string;
  noteCount: number;
  subfolderCount: number;
}) {
  const uid   = useId().replace(/:/g, "");
  const total = noteCount + subfolderCount;

  /* Mini vignette de document placée à (ox, oy) */
  function DocThumb({ ox, oy, op = 1 }: { ox: number; oy: number; op?: number }) {
    const w = 37, h = 30, fold = 8;
    return (
      <g opacity={op}>
        {/* Corps du document */}
        <path
          d={`M${ox},${oy + fold} L${ox},${oy + h} Q${ox},${oy + h + 3} ${ox + 3},${oy + h + 3} L${ox + w - 3},${oy + h + 3} Q${ox + w},${oy + h + 3} ${ox + w},${oy + h} L${ox + w},${oy} L${ox + fold},${oy} Z`}
          fill="white"
          opacity="0.92"
        />
        {/* Coin plié */}
        <path
          d={`M${ox},${oy + fold} L${ox + fold},${oy} L${ox + fold},${oy + fold} Z`}
          fill={color}
          opacity="0.35"
        />
        {/* Lignes de texte */}
        <rect x={ox + 6} y={oy + fold + 5}  width="18" height="2.5" rx="1" fill={color} opacity="0.28" />
        <rect x={ox + 6} y={oy + fold + 10} width="24" height="2"   rx="1" fill={color} opacity="0.20" />
        <rect x={ox + 6} y={oy + fold + 15} width="20" height="2"   rx="1" fill={color} opacity="0.16" />
        <rect x={ox + 6} y={oy + fold + 20} width="14" height="2"   rx="1" fill={color} opacity="0.12" />
      </g>
    );
  }

  return (
    <svg viewBox="0 0 100 86" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-hidden>
      <defs>
        {/* Dégradé corps : léger reflet haut → ombre basse */}
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="white" stopOpacity="0.22" />
          <stop offset="55%"  stopColor="white" stopOpacity="0.00" />
          <stop offset="100%" stopColor="black" stopOpacity="0.20" />
        </linearGradient>
        {/* Dégradé onglet */}
        <linearGradient id={`${uid}t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="black" stopOpacity="0.08" />
        </linearGradient>
        {/* Filtre ombre portée sous le dossier */}
        <filter id={`${uid}s`} x="-10%" y="-10%" width="120%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="black" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* ── Onglet ── */}
      <path d="M4,23 L4,16 Q4,12 8,12 L38,12 Q42.5,12 44.5,17 L50,23 Z" fill={color} />
      <path d="M4,23 L4,16 Q4,12 8,12 L38,12 Q42.5,12 44.5,17 L50,23 Z"
            fill={`url(#${uid}t)`} />

      {/* ── Corps du dossier ── */}
      <rect x="4" y="23" width="92" height="57" rx="9" fill={color}
            filter={`url(#${uid}s)`} />
      <rect x="4" y="23" width="92" height="57" rx="9"
            fill={`url(#${uid}b)`} />

      {/* Ligne de reflet haute */}
      <rect x="4" y="23" width="92" height="5" rx="3" fill="white" opacity="0.22" />

      {/* ── Contenu ── */}
      {total > 0 ? (
        <>
          <DocThumb ox={9}  oy={32} />
          {total >= 2 && <DocThumb ox={54} oy={32} />}
          {total >= 3 && <DocThumb ox={9}  oy={63} op={0.45} />}
          {total >= 4 && <DocThumb ox={54} oy={63} op={0.45} />}
        </>
      ) : (
        /* Dossier vide : lignes discrètes */
        <>
          <line x1="25" y1="56" x2="75" y2="56"
                stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.22" />
          <line x1="33" y1="63" x2="67" y2="63"
                stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.13" />
        </>
      )}
    </svg>
  );
}

/* ═══════════════════════════════════ Carte dossier ══════════════════════ */
function FolderCard({
  folder,
  notes,
  subfolders,
  onOpen,
  onDelete,
}: {
  folder: NoteFolder;
  notes: RichNote[];
  subfolders: NoteFolder[];
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const total = notes.length + subfolders.length;

  return (
    <div className="group relative flex flex-col items-center gap-1">
      {/* Icône dossier cliquable */}
      <button
        type="button"
        onClick={onOpen}
        className="w-full cursor-pointer rounded-xl transition-transform hover:-translate-y-0.5 active:scale-95"
        aria-label={`Ouvrir ${folder.nom}`}
      >
        <FolderIconSvg
          color={folder.bgColor}
          noteCount={notes.length}
          subfolderCount={subfolders.length}
        />
      </button>

      {/* Nom + description + compteur */}
      <div className="w-full space-y-0.5 px-0.5 text-center">
        <p className="truncate text-[0.78rem] font-semibold leading-snug tracking-tight">
          {folder.nom}
        </p>
        {folder.description && (
          <p
            className="truncate leading-tight text-muted"
            style={{ fontSize: "0.63rem" }}
            title={folder.description}
          >
            {folder.description}
          </p>
        )}
        <p className="leading-tight text-muted" style={{ fontSize: "0.60rem", opacity: 0.50 }}>
          {total === 0 ? "vide" : `${total} élément${total !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Bouton options (visible au survol) */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setMenuOpen((x) => !x); }}
        className="absolute right-0 top-0 grid h-6 w-6 place-items-center rounded-full bg-elevated/90 text-xs text-muted opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-[var(--text)]"
        aria-label="Options"
      >
        ···
      </button>

      {/* Menu contextuel */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-7 z-20 min-w-[130px] overflow-hidden rounded-xl elevated-surface shadow-xl">
            <button
              type="button"
              onClick={() => { onDelete(); setMenuOpen(false); }}
              className="flex w-full items-center px-3 py-2.5 text-sm text-[var(--red)] hover:bg-[var(--surface)]"
            >
              Supprimer
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════ Carte note (masonry) ════════════════ */
function NoteCard({
  note,
  onClick,
  onDelete,
  onDuplicate,
  onPin,
}: {
  note: RichNote;
  onClick: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPin: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const preview = note.contenu
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  const isLight   = isLightColor(note.bgColor);
  const textColor = isLight ? "#12121a" : "#f4f4f8";
  const isDefault = note.bgColor === "#18181f";

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97]"
      style={{
        background: note.bgColor,
        color: textColor,
        border: isDefault ? "1px solid var(--border)" : "1px solid transparent",
      }}
      onClick={onClick}
    >
      <div className="p-3.5">
        {/* Titre + épingle */}
        <div className="flex items-start justify-between gap-1">
          <p className="flex-1 font-semibold leading-snug" style={{ fontSize: "0.85rem" }}>
            {note.titre || <span className="italic opacity-50">Sans titre</span>}
          </p>
          {note.epingle && (
            <span className="shrink-0 text-sm leading-none opacity-70" title="Épinglée">📌</span>
          )}
        </div>

        {/* Aperçu contenu */}
        {preview && (
          <p className="mt-1.5 leading-relaxed opacity-75" style={{ fontSize: "0.75rem" }}>
            {preview}
            {preview.length === 160 && <span className="opacity-50">…</span>}
          </p>
        )}

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {note.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full px-2 py-0.5 ring-1 ring-current/30"
                style={{ fontSize: "0.62rem", opacity: 0.7 }}
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Pied de carte */}
        <div className="mt-3 flex items-center justify-between">
          <p style={{ fontSize: "0.62rem", opacity: 0.45 }}>
            {new Date(note.updatedAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((x) => !x); }}
            className="grid h-5 w-5 place-items-center rounded-full text-base opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
            aria-label="Options"
          >
            ⋯
          </button>
        </div>
      </div>

      {/* Menu contextuel */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
          />
          <div
            className="absolute bottom-10 right-2 z-20 min-w-[130px] overflow-hidden rounded-xl elevated-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {[
              {
                label: note.epingle ? "Désépingler" : "Épingler",
                action: () => { onPin(); setMenuOpen(false); },
              },
              { label: "Dupliquer", action: () => { onDuplicate(); setMenuOpen(false); } },
              {
                label: "Supprimer",
                action: () => { onDelete(); setMenuOpen(false); },
                danger: true,
              },
            ].map(({ label, action, danger }) => (
              <button
                key={label}
                type="button"
                onClick={action}
                className={`flex w-full items-center px-3 py-2.5 text-sm hover:bg-[var(--surface)] ${
                  danger ? "text-[var(--red)]" : "text-[var(--text)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════ Éditeur complet ═════════════════════ */
function NoteEditor({
  note,
  folders,
  onDelete,
}: {
  note: RichNote;
  folders: NoteFolder[];
  onDelete: () => void;
}) {
  const [editingTitle, setEditingTitle]   = useState(note.titre);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTagInput, setShowTagInput]   = useState(false);
  const [newTag, setNewTag]               = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: note.contenu,
    editorProps: {
      attributes: {
        class: "min-h-[40vh] focus:outline-none px-1 py-2 leading-relaxed",
        style: `color: ${isLightColor(note.bgColor) ? "#12121a" : "#f4f4f8"}`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      void db.notes.update(note.id, { contenu: ed.getHTML(), updatedAt: Date.now() });
    },
  });

  useEffect(() => {
    if (editor && note.contenu !== editor.getHTML()) {
      editor.commands.setContent(note.contenu, false);
    }
  }, [note.id, note.contenu, editor]);

  useEffect(() => {
    setEditingTitle(note.titre);
  }, [note.id, note.titre]);

  async function saveTitle() {
    if (editingTitle.trim() && editingTitle !== note.titre) {
      await db.notes.update(note.id, { titre: editingTitle.trim(), updatedAt: Date.now() });
    }
  }

  async function setBgColor(color: string) {
    await db.notes.update(note.id, { bgColor: color, updatedAt: Date.now() });
    setShowColorPicker(false);
  }

  async function addTag() {
    const t = newTag.trim().toLowerCase();
    if (!t || note.tags.includes(t)) return;
    await db.notes.update(note.id, { tags: [...note.tags, t], updatedAt: Date.now() });
    setNewTag("");
    setShowTagInput(false);
  }

  async function removeTag(tag: string) {
    await db.notes.update(note.id, {
      tags: note.tags.filter((t) => t !== tag),
      updatedAt: Date.now(),
    });
  }

  async function moveToFolder(dossierId: string | undefined) {
    await db.notes.update(note.id, { dossierId, updatedAt: Date.now() });
    toast.ok("Note déplacée");
  }

  async function onPickAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.info("Pour l’instant, seules les images sont acceptées.");
      return;
    }
    if (file.size > 600_000) {
      toast.info("Image trop lourde (max. ~600 Ko).");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("read"));
      r.readAsDataURL(file);
    });
    const att: RichNoteAttachment = {
      id: crypto.randomUUID(),
      fileName: file.name,
      mimeType: file.type,
      dataUrl,
    };
    await db.notes.update(note.id, {
      attachments: [...(note.attachments ?? []), att],
      updatedAt: Date.now(),
    });
    toast.ok("Pièce jointe ajoutée");
  }

  async function removeAttachment(id: string) {
    await db.notes.update(note.id, {
      attachments: (note.attachments ?? []).filter((a) => a.id !== id),
      updatedAt: Date.now(),
    });
  }

  const textColor = isLightColor(note.bgColor) ? "#12121a" : "#f4f4f8";

  return (
    <div
      className="min-h-[70vh] rounded-2xl border border-border p-5 transition-colors"
      style={{ background: note.bgColor, color: textColor }}
    >
      {/* Titre */}
      <input
        className="w-full bg-transparent text-2xl font-bold outline-none placeholder-current/40"
        style={{ color: textColor }}
        value={editingTitle}
        onChange={(e) => setEditingTitle(e.target.value)}
        onBlur={() => void saveTitle()}
        placeholder="Titre de la note"
      />

      {/* Métadonnées */}
      <div className="my-3 flex flex-wrap items-center gap-2 text-sm opacity-60">
        <span>
          {new Date(note.updatedAt).toLocaleString("fr-FR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <select
          className="rounded-lg border border-current/20 bg-transparent px-2 py-0.5 text-xs"
          value={note.dossierId ?? ""}
          onChange={(e) => void moveToFolder(e.target.value || undefined)}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">📋 Racine</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.icone} {f.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="my-3 flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPickAttachment(e)} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-current/25 px-3 py-1.5 text-xs font-medium opacity-80 hover:opacity-100"
        >
          📎 Image jointe
        </button>
        {(note.attachments ?? []).map((a) => (
          <span key={a.id} className="inline-flex items-center gap-1 rounded-lg border border-current/20 px-2 py-1 text-xs">
            <a href={a.dataUrl} download={a.fileName} className="underline opacity-90">
              {a.fileName}
            </a>
            <button type="button" className="opacity-60 hover:opacity-100" onClick={() => void removeAttachment(a.id)} aria-label="Retirer">
              ✕
            </button>
          </span>
        ))}
      </div>

      {/* Tags */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {note.tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => void removeTag(t)}
            className="flex items-center gap-1 rounded-full border border-current/20 px-2 py-0.5 text-xs opacity-70 hover:opacity-100"
          >
            #{t} <span>✕</span>
          </button>
        ))}
        {showTagInput ? (
          <form
            onSubmit={(e) => { e.preventDefault(); void addTag(); }}
            className="flex items-center gap-1"
          >
            <input
              autoFocus
              className="w-24 rounded-full border border-current/20 bg-transparent px-2 py-0.5 text-xs outline-none"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="tag…"
              onBlur={() => setShowTagInput(false)}
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowTagInput(true)}
            className="rounded-full border border-current/20 px-2 py-0.5 text-xs opacity-50 hover:opacity-100"
          >
            + tag
          </button>
        )}
      </div>

      {/* Barre d'outils */}
      <div className="mb-3 flex flex-wrap gap-1 border-b border-current/10 pb-3">
        {[
          { label: "𝐁",  tip: "Gras",             action: () => editor?.chain().focus().toggleBold().run(),              active: editor?.isActive("bold") },
          { label: "𝘐",  tip: "Italique",          action: () => editor?.chain().focus().toggleItalic().run(),            active: editor?.isActive("italic") },
          { label: "S̶",  tip: "Barré",             action: () => editor?.chain().focus().toggleStrike().run(),            active: editor?.isActive("strike") },
          { label: "H1", tip: "Titre 1",           action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: editor?.isActive("heading", { level: 1 }) },
          { label: "H2", tip: "Titre 2",           action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive("heading", { level: 2 }) },
          { label: "•",  tip: "Liste",             action: () => editor?.chain().focus().toggleBulletList().run(),         active: editor?.isActive("bulletList") },
          { label: "1.", tip: "Liste numérotée",   action: () => editor?.chain().focus().toggleOrderedList().run(),        active: editor?.isActive("orderedList") },
          { label: "❝",  tip: "Citation",          action: () => editor?.chain().focus().toggleBlockquote().run(),         active: editor?.isActive("blockquote") },
        ].map(({ label, tip, action, active }) => (
          <ToolBtn key={tip} label={label} title={tip} onClick={action} active={active} textColor={textColor} />
        ))}

        <div className="ml-auto flex gap-1">
          <button
            type="button"
            title="Couleur de fond"
            onClick={() => setShowColorPicker((x) => !x)}
            className="rounded-lg px-2 py-1 text-sm opacity-60 hover:opacity-100"
          >
            🎨
          </button>
          <button
            type="button"
            title={note.epingle ? "Désépingler" : "Épingler"}
            onClick={() =>
              void db.notes.update(note.id, { epingle: !note.epingle, updatedAt: Date.now() })
            }
            className="rounded-lg px-2 py-1 text-sm opacity-60 hover:opacity-100"
          >
            {note.epingle ? "📌" : "📍"}
          </button>
          <button
            type="button"
            title="Supprimer la note"
            onClick={onDelete}
            className="rounded-lg px-2 py-1 text-sm opacity-60 hover:text-[var(--red)] hover:opacity-100"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Sélecteur couleur */}
      {showColorPicker && (
        <div className="mb-4 flex flex-wrap gap-2">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => void setBgColor(c.value)}
              className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 active:scale-90"
              style={{
                background: c.value,
                borderColor: note.bgColor === c.value ? textColor : "transparent",
              }}
            />
          ))}
        </div>
      )}

      {/* Éditeur riche */}
      <EditorContent editor={editor} />
    </div>
  );
}

/* ── Bouton toolbar ── */
function ToolBtn({
  label,
  title,
  onClick,
  active,
  textColor,
}: {
  label: string;
  title: string;
  onClick: () => void;
  active?: boolean;
  textColor: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-lg px-2 py-1 text-sm transition-all"
      style={{
        background: active ? `${textColor}25` : "transparent",
        color: textColor,
        opacity: active ? 1 : 0.6,
      }}
    >
      {label}
    </button>
  );
}

/* ═══════════════════════════════════ Modal création dossier ══════════════ */
function CreateFolderModal({
  open,
  onClose,
  parentId,
}: {
  open: boolean;
  onClose: () => void;
  parentId?: string;
}) {
  const [nom, setNom]               = useState("");
  const [description, setDescription] = useState("");
  const [couleur, setCouleur]       = useState(FOLDER_TINTS[0]!.value);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    await db.noteFolders.add({
      id: crypto.randomUUID(),
      nom: nom.trim(),
      description: description.trim() || undefined,
      icone: "📁",
      bgColor: couleur,
      parentId,
      createdAt: Date.now(),
    });
    toast.ok(`Dossier « ${nom} » créé`);
    setNom("");
    setDescription("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau dossier">
      <form onSubmit={submit} className="space-y-4">
        {/* Aperçu de l'icône */}
        <div className="flex justify-center">
          <div className="w-24">
            <FolderIconSvg color={couleur} noteCount={0} subfolderCount={0} />
          </div>
        </div>

        {/* Nom */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">Nom du dossier</label>
          <input
            autoFocus
            className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 outline-none focus:border-accent"
            placeholder="ex. Idées, Travail, Personnel…"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">Description (optionnelle)</label>
          <input
            className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-accent"
            placeholder="Une courte description…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Couleur */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted">Couleur</label>
          <div className="flex flex-wrap gap-2.5">
            {FOLDER_TINTS.map((t) => (
              <button
                key={t.value}
                type="button"
                title={t.label}
                onClick={() => setCouleur(t.value)}
                className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 active:scale-90"
                style={{
                  background: t.value,
                  borderColor: couleur === t.value ? "var(--text)" : "transparent",
                  boxShadow: couleur === t.value ? `0 0 0 2px var(--surface), 0 0 0 4px ${t.value}` : "none",
                }}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!nom.trim()}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-white transition-opacity active:scale-95 disabled:opacity-40"
        >
          Créer le dossier
        </button>
      </form>
    </Modal>
  );
}

/* ── Utilitaire luminosité couleur ── */
function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}
