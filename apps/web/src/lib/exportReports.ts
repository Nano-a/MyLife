import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import type { AgendaEvent, FinanceTransaction } from "@mylife/core";

export type AgendaExportPeriod = "jour" | "semaine" | "mois" | "trimestre" | "semestre" | "annee";

export function agendaPeriodBounds(period: AgendaExportPeriod, ref: Date): { start: number; end: number } {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();
  switch (period) {
    case "jour": {
      const s = new Date(y, m, d, 0, 0, 0).getTime();
      return { start: s, end: s + 86_400_000 };
    }
    case "semaine": {
      const dow = ref.getDay();
      const s = new Date(y, m, d - dow, 0, 0, 0).getTime();
      return { start: s, end: s + 7 * 86_400_000 };
    }
    case "mois": {
      const s = new Date(y, m, 1).getTime();
      return { start: s, end: new Date(y, m + 1, 1).getTime() };
    }
    case "trimestre": {
      const q = Math.floor(m / 3) * 3;
      const s = new Date(y, q, 1).getTime();
      return { start: s, end: new Date(y, q + 3, 1).getTime() };
    }
    case "semestre": {
      const h = m < 6 ? 0 : 6;
      const s = new Date(y, h, 1).getTime();
      return { start: s, end: new Date(y, h + 6, 1).getTime() };
    }
    case "annee":
    default:
      return { start: new Date(y, 0, 1).getTime(), end: new Date(y + 1, 0, 1).getTime() };
  }
}

function filterEventsInWindow(events: AgendaEvent[], start: number, end: number): AgendaEvent[] {
  return events.filter((e) => e.debut < end && e.fin > start).sort((a, b) => a.debut - b.debut);
}

export function downloadAgendaPdf(
  events: AgendaEvent[],
  period: AgendaExportPeriod,
  refDate: Date,
  filename: string
): void {
  const { start, end } = agendaPeriodBounds(period, refDate);
  const list = filterEventsInWindow(events, start, end);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;
  doc.setFontSize(16);
  doc.text("Agenda MyLife", margin, y);
  y += 28;
  doc.setFontSize(10);
  doc.text(`Période : ${period} · ${refDate.toLocaleDateString("fr-FR")}`, margin, y);
  y += 24;
  doc.setFontSize(9);
  for (const e of list) {
    if (y > 750) {
      doc.addPage();
      y = margin;
    }
    const line = `${new Date(e.debut).toLocaleString("fr-FR")} — ${e.titre}${e.lieu ? ` (${e.lieu})` : ""}`;
    const split = doc.splitTextToSize(line, 500);
    doc.text(split, margin, y);
    y += split.length * 12 + 6;
  }
  if (list.length === 0) doc.text("Aucun événement sur cette période.", margin, y);
  doc.save(filename);
}

export function downloadAgendaXlsx(
  events: AgendaEvent[],
  period: AgendaExportPeriod,
  refDate: Date,
  filename: string
): void {
  const { start, end } = agendaPeriodBounds(period, refDate);
  const list = filterEventsInWindow(events, start, end);
  const rows = list.map((e) => ({
    titre: e.titre,
    debut: new Date(e.debut).toISOString(),
    fin: new Date(e.fin).toISOString(),
    lieu: e.lieu ?? "",
    categorie: e.categorie,
    recurrence: e.recurrence,
  }));
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ titre: "—", debut: "", fin: "", lieu: "", categorie: "", recurrence: "" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Agenda");
  XLSX.writeFile(wb, filename);
}

export function downloadFinanceReportPdf(
  txs: FinanceTransaction[],
  snaps: { date: string; solde: number }[],
  filename: string
): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 48;
  doc.setFontSize(16);
  doc.text("Rapport finances MyLife", 48, y);
  y += 32;
  doc.setFontSize(10);
  const sortedSnaps = [...snaps].sort((a, b) => a.date.localeCompare(b.date));
  doc.text("Soldes relevés", 48, y);
  y += 18;
  for (const s of sortedSnaps.slice(-24)) {
    doc.text(`${s.date} : ${s.solde.toLocaleString("fr-FR")} €`, 56, y);
    y += 14;
    if (y > 720) {
      doc.addPage();
      y = 48;
    }
  }
  y += 10;
  doc.text("Dernières transactions", 48, y);
  y += 18;
  for (const t of [...txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40)) {
    const line = `${t.date} · ${t.type} · ${t.montant} € · ${t.categorie}${t.superflue ? " (superflu)" : ""}`;
    const split = doc.splitTextToSize(line, 480);
    doc.text(split, 56, y);
    y += split.length * 12 + 4;
    if (y > 720) {
      doc.addPage();
      y = 48;
    }
  }
  doc.save(filename);
}

export function downloadFinanceReportXlsx(txs: FinanceTransaction[], filename: string): void {
  const rows = [...txs].sort((a, b) => b.date.localeCompare(a.date)).map((t) => ({
    date: t.date,
    type: t.type,
    montant: t.montant,
    categorie: t.categorie,
    superflue: t.superflue ? "oui" : "non",
    commentaire: t.commentaire ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ date: "", type: "", montant: 0, categorie: "", superflue: "", commentaire: "" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  XLSX.writeFile(wb, filename);
}
