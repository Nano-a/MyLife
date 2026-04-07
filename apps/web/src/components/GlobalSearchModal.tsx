import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../db";
import { Modal } from "./Modal";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function GlobalSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const events = useLiveQuery(() => db.events.toArray(), []) ?? [];
  const notes = useLiveQuery(() => db.notes.toArray(), []) ?? [];
  const goals = useLiveQuery(() => db.objectives.toArray(), []) ?? [];
  const txs = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    type Hit = { kind: string; title: string; sub?: string; onSelect: () => void };
    const hits: Hit[] = [];

    for (const e of events) {
      const hay = `${e.titre} ${e.description ?? ""} ${e.lieu ?? ""}`.toLowerCase();
      if (hay.includes(needle))
        hits.push({
          kind: "📅",
          title: e.titre,
          sub: new Date(e.debut).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }),
          onSelect: () => {
            onClose();
            navigate("/app/agenda");
          },
        });
    }
    for (const n of notes) {
      const hay = `${n.titre} ${stripHtml(n.contenu)}`.toLowerCase();
      if (hay.includes(needle))
        hits.push({
          kind: "📓",
          title: n.titre || "(Sans titre)",
          onSelect: () => {
            onClose();
            navigate("/app/notes");
          },
        });
    }
    for (const g of goals) {
      if (`${g.titre} ${g.description ?? ""}`.toLowerCase().includes(needle))
        hits.push({
          kind: "🎯",
          title: g.titre,
          onSelect: () => {
            onClose();
            navigate("/app/objectifs");
          },
        });
    }
    for (const x of txs) {
      if (`${x.categorie} ${x.commentaire ?? ""}`.toLowerCase().includes(needle))
        hits.push({
          kind: "💰",
          title: `${x.montant} € · ${x.categorie}`,
          sub: x.date,
          onSelect: () => {
            onClose();
            navigate("/app/finances");
          },
        });
    }
    for (const h of habits) {
      if (h.nom.toLowerCase().includes(needle))
        hits.push({
          kind: "✅",
          title: h.nom,
          onSelect: () => {
            onClose();
            navigate("/app/habitudes");
          },
        });
    }
    return hits.slice(0, 40);
  }, [q, events, notes, goals, txs, habits, navigate, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Recherche globale">
      <input
        autoFocus
        className="mb-3 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 outline-none focus:border-accent"
        placeholder="Rechercher…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {q.trim().length < 2 ? (
        <p className="text-sm text-muted">
          2 caractères minimum. Accès direct :{" "}
          <button
            type="button"
            className="text-accent underline"
            onClick={() => {
              onClose();
              navigate("/app/carnet");
            }}
          >
            Carnet de vie
          </button>
        </p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted">Aucun résultat</p>
      ) : (
        <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={r.onSelect}
                className="flex w-full items-start gap-2 rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-left text-sm hover:border-accent active:scale-[0.99]"
              >
                <span className="shrink-0">{r.kind}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{r.title}</span>
                  {r.sub && <span className="mt-0.5 block text-xs text-muted">{r.sub}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
