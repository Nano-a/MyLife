import type { AgendaEvent } from "@mylife/core";

function esc(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

/** Pour titres / HTML imprimable (pas pour CSV). */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildPrintableAgendaHtml(events: AgendaEvent[]): string {
  const sorted = [...events].sort((a, b) => a.debut - b.debut);
  const rows = sorted.map((e) => {
    const when = e.journeeEntiere
      ? new Date(e.debut).toLocaleDateString("fr-FR")
      : `${new Date(e.debut).toLocaleString("fr-FR")} – ${new Date(e.fin).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
    return `<tr><td>${escapeHtml(e.titre)}</td><td>${escapeHtml(when)}</td><td>${escapeHtml(e.lieu ?? "")}</td><td>${escapeHtml(e.categorie)}</td></tr>`;
  });
  return `<table><thead><tr><th>Titre</th><th>Quand</th><th>Lieu</th><th>Catégorie</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

export function downloadAgendaCsv(events: AgendaEvent[], filename: string): void {
  const lines = ["titre,debut_iso,fin_iso,lieu,categorie,recurrence"];
  for (const e of events) {
    lines.push(
      [
        esc(e.titre),
        new Date(e.debut).toISOString(),
        new Date(e.fin).toISOString(),
        esc(e.lieu ?? ""),
        e.categorie,
        e.recurrence,
      ].join(",")
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Ouvre la boîte d’impression (vue agenda imprimable). */
export function printAgendaWindow(title: string, htmlBody: string): void {
  const safeTitle = escapeHtml(title);
  const w = window.open("", "_blank", "width=800,height=600");
  if (!w) return;
  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title>
    <style>body{font-family:system-ui;padding:1rem;} table{width:100%;border-collapse:collapse} td,th{border:1px solid #ccc;padding:6px;text-align:left}</style>
    </head><body><h1>${safeTitle}</h1>${htmlBody}</body></html>`
  );
  w.document.close();
  w.focus();
  w.print();
}
