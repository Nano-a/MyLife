import type { FinanceTransaction } from "./types.js";

/** Solde « parfait » : revenus - dépenses non superflues uniquement (simplifié) */
export function computePerfectBalanceDelta(transactions: FinanceTransaction[]): number {
  let delta = 0;
  for (const t of transactions) {
    if (t.type === "revenu" || t.type === "gain") delta += t.montant;
    else if (t.type === "depense" && !t.superflue) delta -= t.montant;
    else if (t.type === "epargne") delta -= t.montant;
    // abonnements : on compte comme dépense récurrente si présents dans liste
    else if (t.type === "abonnement") delta -= t.montant;
  }
  return Math.round(delta * 100) / 100;
}
