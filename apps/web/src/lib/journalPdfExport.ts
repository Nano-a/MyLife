import { jsPDF } from "jspdf";
import type {
  AgendaEvent,
  FinanceTransaction,
  Habit,
  HabitCompletion,
  HydrationDay,
  MoodDay,
  SportSession,
} from "@mylife/core";
import { totalDrunkMl } from "@mylife/core";
import {
  dayHasAnyRecord,
  daysInMonth,
  eventsForLocalDay,
  financeTxForDay,
  habitLinesForDay,
  isoFromYmd,
  sportSessionsForDay,
  yearSummary,
} from "./dayJournal";
import { formatFrDateLong } from "./dateUtils";

const MONTHS_FR = [
  "",
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function pushLines(doc: jsPDF, lines: string[], startY: number, margin: number, maxW: number): number {
  let y = startY;
  const lh = 5;
  const pageH = doc.internal.pageSize.getHeight();
  for (const raw of lines) {
    const parts = doc.splitTextToSize(raw, maxW);
    for (const line of parts) {
      if (y > pageH - 16) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += lh;
    }
  }
  return y;
}

function buildDayTextBlocks(
  dateISO: string,
  habits: Habit[],
  completions: (HabitCompletion & { id: string })[],
  mood: MoodDay | undefined,
  hyd: HydrationDay | undefined,
  events: AgendaEvent[],
  sport: SportSession[],
  txs: FinanceTransaction[]
): string[] {
  if (
    !dayHasAnyRecord(dateISO, habits, completions, mood, hyd, events, sport, txs)
  ) {
    return [];
  }
  const out: string[] = [];
  out.push(formatFrDateLong(dateISO).toUpperCase());

  const hLines = habitLinesForDay(dateISO, habits, completions);
  if (hLines.length) {
    out.push("  Habitudes :");
    for (const l of hLines) {
      let s = `    ${l.icone} ${l.nom} : `;
      if (l.status === "fait") s += "fait";
      else if (l.status === "quantite") s += l.detail ?? "quantité";
      else if (l.status === "skip_legit") s += `non fait (légitime) — ${l.detail ?? ""}`;
      else if (l.status === "skip_excuse") s += `non fait (excuse) — ${l.detail ?? ""}`;
      else s += "pas de saisie / non fait";
      out.push(s);
    }
  }

  if (mood) {
    out.push(`  Humeur : ${mood.score}/5${mood.note ? ` — ${mood.note}` : ""}`);
  }

  if (hyd?.entries.length) {
    const ml = totalDrunkMl(hyd.entries);
    out.push(`  Hydratation : ${(ml / 1000).toFixed(2)} L (${hyd.entries.length} prises)`);
  }

  const evs = eventsForLocalDay(dateISO, events);
  if (evs.length) {
    out.push("  Agenda :");
    for (const e of evs) {
      const t0 = new Date(e.debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      out.push(`    · ${t0} ${e.titre}${e.lieu ? ` (${e.lieu})` : ""}`);
    }
  }

  const sp = sportSessionsForDay(dateISO, sport);
  if (sp.length) {
    out.push("  Sport :");
    for (const s of sp) {
      const dm = Math.round((s.fin - s.debut) / 60000);
      out.push(`    · ${s.libelle} — ${dm} min · ${s.intensite}`);
    }
  }

  const tx = financeTxForDay(dateISO, txs);
  if (tx.length) {
    out.push("  Finances :");
    for (const t of tx) {
      out.push(`    · ${t.type} ${t.montant} EUR — ${t.categorie}${t.commentaire ? ` (${t.commentaire})` : ""}`);
    }
  }

  out.push("");
  return out;
}

export function downloadYearJournalPdf(
  year: number,
  habits: Habit[],
  completions: (HabitCompletion & { id: string })[],
  moodByDate: Map<string, MoodDay>,
  hydByDate: Map<string, HydrationDay>,
  events: AgendaEvent[],
  sport: SportSession[],
  txs: FinanceTransaction[],
  appName: string
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const maxW = 180;
  let y = 20;

  doc.setFontSize(16);
  doc.text(`${appName} — Carnet ${year}`, margin, y);
  y += 10;

  doc.setFontSize(10);
  const ys = yearSummary(year, habits, completions, moodByDate, hydByDate);
  doc.text("Synthèse par mois :", margin, y);
  y += 6;
  for (const row of ys) {
    const line = `  ${MONTHS_FR[row.month]} : ${row.daysWithData} jour(s) avec données · score habitudes moy. ${row.avgScoreWhenDue}% (jours avec habitudes prévues) · ${row.moodDays} humeur(s)`;
    const wrapped = doc.splitTextToSize(line, maxW);
    for (const w of wrapped) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(w, margin, y);
      y += 5;
    }
  }
  y += 4;
  doc.setFontSize(11);
  doc.text("Détail des jours enregistrés", margin, y);
  y += 7;
  doc.setFontSize(9);

  const allBlocks: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const dim = daysInMonth(year, m);
    for (let d = 1; d <= dim; d++) {
      const iso = isoFromYmd(year, m, d);
      const blocks = buildDayTextBlocks(
        iso,
        habits,
        completions,
        moodByDate.get(iso),
        hydByDate.get(iso),
        events,
        sport,
        txs
      );
      allBlocks.push(...blocks);
    }
  }

  if (allBlocks.length === 0) {
    allBlocks.push("Aucune donnée sur cette année.");
  }

  pushLines(doc, allBlocks, y, margin, maxW);

  doc.save(`mylife-carnet-${year}.pdf`);
}

export function downloadMonthJournalPdf(
  year: number,
  month1to12: number,
  habits: Habit[],
  completions: (HabitCompletion & { id: string })[],
  moodByDate: Map<string, MoodDay>,
  hydByDate: Map<string, HydrationDay>,
  events: AgendaEvent[],
  sport: SportSession[],
  txs: FinanceTransaction[],
  appName: string
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const maxW = 180;
  let y = 20;
  const title = `${MONTHS_FR[month1to12]} ${year}`;
  doc.setFontSize(16);
  doc.text(`${appName} — ${title}`, margin, y);
  y += 10;
  doc.setFontSize(9);

  const dim = daysInMonth(year, month1to12);
  const allBlocks: string[] = [];
  for (let d = 1; d <= dim; d++) {
    const iso = isoFromYmd(year, month1to12, d);
    allBlocks.push(
      ...buildDayTextBlocks(
        iso,
        habits,
        completions,
        moodByDate.get(iso),
        hydByDate.get(iso),
        events,
        sport,
        txs
      )
    );
  }
  if (allBlocks.length === 0) allBlocks.push("Aucune donnée ce mois-ci.");

  pushLines(doc, allBlocks, y, margin, maxW);
  doc.save(`mylife-carnet-${year}-${String(month1to12).padStart(2, "0")}.pdf`);
}

export function downloadDayJournalPdf(
  dateISO: string,
  habits: Habit[],
  completions: (HabitCompletion & { id: string })[],
  mood: MoodDay | undefined,
  hyd: HydrationDay | undefined,
  events: AgendaEvent[],
  sport: SportSession[],
  txs: FinanceTransaction[],
  appName: string
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const maxW = 180;
  doc.setFontSize(14);
  doc.text(`${appName}`, margin, 18);
  doc.setFontSize(11);
  const blocks = buildDayTextBlocks(dateISO, habits, completions, mood, hyd, events, sport, txs);
  const lines = blocks.length ? blocks : ["Aucune donnée pour ce jour."];
  pushLines(doc, lines, 28, margin, maxW);
  doc.save(`mylife-jour-${dateISO}.pdf`);
}
