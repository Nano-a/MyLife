import type { AppPreferences } from "@mylife/core";
import {
  DEFAULT_SPORT_TEMPLATES,
  defaultLifeflowUiBlob,
  mapTextScaleToFontSize,
  nearestAccentId,
} from "./ui-bridge";
import { db } from "./db";
import { defaultPrefs, defaultProfile } from "./defaults";

const LIFEFLOW_UI_KEY = "lifeflow_ui";

export async function ensureSeedData(): Promise<void> {
  const hasProfile = await db.settings.get("profile");
  const hasPrefs = await db.settings.get("prefs");
  if (!hasProfile) await db.settings.put({ key: "profile", value: defaultProfile });
  if (!hasPrefs) await db.settings.put({ key: "prefs", value: defaultPrefs });

  const tplCount = await db.sportTemplates.count();
  if (tplCount === 0) {
    for (const t of DEFAULT_SPORT_TEMPLATES) {
      await db.sportTemplates.add(t);
    }
  }

  const uiRow = await db.settings.get(LIFEFLOW_UI_KEY);
  if (!uiRow) {
    const prefs = (await db.settings.get("prefs"))?.value as AppPreferences | undefined;
    const blob = defaultLifeflowUiBlob();
    if (prefs?.accentColor) blob.accentColor = nearestAccentId(prefs.accentColor);
    blob.fontSize = mapTextScaleToFontSize(prefs?.textScale ?? "normal");
    await db.settings.put({ key: LIFEFLOW_UI_KEY, value: blob });
  }
}
