import { totalDrunkMl } from "@mylife/core";
import type { UserProfile } from "@mylife/core";
import { db, type HydrationRow } from "../db";

/** Pire cas : horizon d’affichage (optimisme prudent). */
export const DUREE_PIRE_CAS_JOURS = 365;

export type ChronicDehydrationDuration =
  | "under_1y"
  | "1_3y"
  | "3_5y"
  | "over_5y"
  | "unknown";

export type ChronicSymptomSeverity = "leger" | "modere" | "severe";

export interface HydrationChronicJourney {
  journeyStartISO: string;
  onboardingShown: boolean;
  chronicDuration?: ChronicDehydrationDuration;
  sipMl: number;
  boostSport: boolean;
  boostHeat: boolean;
  boostPregnancy: boolean;
  symptomSeverity: ChronicSymptomSeverity;
}

export const HYDRATION_CHRONIC_JOURNEY_KEY = "hydrationChronicJourney";

export function defaultHydrationChronicJourney(todayISO: string): HydrationChronicJourney {
  return {
    journeyStartISO: todayISO,
    onboardingShown: false,
    sipMl: 100,
    boostSport: false,
    boostHeat: false,
    boostPregnancy: false,
    symptomSeverity: "modere",
  };
}

/** Objectif quotidien : 35 ml/kg, plafonné 1,5–4 L, ajustements +0,5 L (réglages). */
export function healingDailyTargetMl(
  profile: UserProfile | null,
  journey: HydrationChronicJourney
): number {
  const kg = profile?.poidsKg ?? 70;
  let liters = kg * 0.035;
  if (journey.boostSport) liters += 0.5;
  if (journey.boostHeat) liters += 0.5;
  if (journey.boostPregnancy) liters += 0.5;
  liters = Math.max(1.5, Math.min(4, liters));
  return Math.round(liters * 1000);
}

function* eachDayISO(fromISO: string, toISO: string): Generator<string> {
  const d = new Date(fromISO + "T12:00:00");
  const end = new Date(toISO + "T12:00:00");
  while (d <= end) {
    yield d.toISOString().slice(0, 10);
    d.setDate(d.getDate() + 1);
  }
}

function hasSaisie(row: HydrationRow | undefined): boolean {
  return Boolean(row && row.entries.length > 0);
}

export interface HealingReplayResult {
  /** Taux affiché 0–120 */
  displayPercent: number;
  cumMlSinceStart: number;
  objectifTotalPireCasMl: number;
  /** Part volume pure (sans pénalités du dernier jour complet) — pour debug / tooltips optionnels */
  volumePercentRaw: number;
}

/**
 * Rejoue les jours depuis le début du parcours jusqu’à `todayISO`.
 * Jours < today : fin de journée complète (pénalités + bonus).
 * Jour = today : cumul volume seulement (pas de pénalité déficit avant fin de journée).
 */
export function replayChronicHealing(
  journey: HydrationChronicJourney,
  hydrationByDate: Map<string, HydrationRow | undefined>,
  profile: UserProfile | null,
  todayISO: string
): HealingReplayResult {
  const targetMl = healingDailyTargetMl(profile, journey);
  const objectifTotalPireCasMl = targetMl * DUREE_PIRE_CAS_JOURS;

  if (journey.journeyStartISO > todayISO) {
    return {
      displayPercent: 0,
      cumMlSinceStart: 0,
      objectifTotalPireCasMl,
      volumePercentRaw: 0,
    };
  }

  let taux = 0;
  let cumMl = 0;
  let consecutiveNoLog = 0;
  let consecutiveNoDrink = 0;

  for (const dayISO of eachDayISO(journey.journeyStartISO, todayISO)) {
    const row = hydrationByDate.get(dayISO);
    const saisie = hasSaisie(row);
    const drunk = saisie ? totalDrunkMl(row!.entries) : 0;

    if (!saisie) consecutiveNoLog++;
    else consecutiveNoLog = 0;

    if (drunk === 0) consecutiveNoDrink++;
    else consecutiveNoDrink = 0;

    cumMl += drunk;

    const volumePercent = Math.min(120, (cumMl / objectifTotalPireCasMl) * 100);
    const isToday = dayISO === todayISO;

    if (isToday) {
      taux = Math.max(taux, volumePercent);
      taux = Math.max(0, Math.min(120, taux));
      return {
        displayPercent: taux,
        cumMlSinceStart: cumMl,
        objectifTotalPireCasMl,
        volumePercentRaw: volumePercent,
      };
    }

    let working = Math.max(taux, volumePercent);

    const deficit = targetMl - drunk;
    const proportionManquee = Math.max(0, deficit / targetMl);
    const perteBrute = proportionManquee * 0.15 * working;
    const perteMaxJour = 0.08 * working;
    const perte = Math.min(perteMaxJour, perteBrute);
    working -= perte;

    const surplusMl = Math.max(0, drunk - targetMl);
    const surplusL = surplusMl / 1000;
    const bonus = Math.min(3, Math.floor(surplusL / 0.5) * 0.5);
    working += bonus;

    if (consecutiveNoLog >= 3) {
      working -= 3;
      consecutiveNoLog = 0;
    }
    if (consecutiveNoDrink >= 7) {
      working -= 5;
      consecutiveNoDrink = 0;
    }

    taux = Math.max(0, Math.min(120, working));
  }

  return {
    displayPercent: taux,
    cumMlSinceStart: cumMl,
    objectifTotalPireCasMl,
    volumePercentRaw: Math.min(120, (cumMl / objectifTotalPireCasMl) * 100),
  };
}

export function healingEncouragementMessage(displayPercent: number): string {
  const p = displayPercent;
  if (p < 15) return "Début du voyage. Votre corps commence à comprendre.";
  if (p < 30) return "Les premiers signes : votre fatigue diminue doucement.";
  if (p < 45) return "Votre peau respire mieux. Continuez, c'est en marche.";
  if (p < 60) return "Vous êtes sur la bonne voie. Ne lâchez rien.";
  if (p < 75) return "Vos cheveux repoussent plus forts. La différence se voit.";
  if (p < 90) return "Presque guéri. Encore un effort, vous y êtes presque.";
  if (p <= 100) return "Félicitations ! Votre corps a retrouvé son équilibre.";
  return "Exceptionnel ! Vous avez dépassé tous les objectifs.";
}

export function chronicDurationEncouragement(duration: ChronicDehydrationDuration | undefined): string {
  if (!duration || duration === "unknown") {
    return "Votre corps a besoin de temps. La guérison complète peut prendre jusqu'à un an. Chaque goutte compte.";
  }
  return "Votre corps a besoin de temps. La guérison complète peut prendre jusqu'à un an. Chaque goutte compte.";
}

export function severityNote(severity: ChronicSymptomSeverity): string | null {
  if (severity === "severe") {
    return "Symptômes sévères : l'application reste prudente sur le calendrier (365 j). En cas de doute, parlez à un professionnel de santé.";
  }
  return null;
}

export async function getHydrationChronicJourney(todayISO: string): Promise<HydrationChronicJourney> {
  const row = await db.settings.get(HYDRATION_CHRONIC_JOURNEY_KEY);
  const base = defaultHydrationChronicJourney(todayISO);
  if (row?.value && typeof row.value === "object") {
    return { ...base, ...(row.value as HydrationChronicJourney) };
  }
  await db.settings.put({ key: HYDRATION_CHRONIC_JOURNEY_KEY, value: base });
  return base;
}

export async function saveHydrationChronicJourney(j: HydrationChronicJourney): Promise<void> {
  await db.settings.put({ key: HYDRATION_CHRONIC_JOURNEY_KEY, value: j });
}
