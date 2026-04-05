import { db } from "./db";
import { defaultPrefs, defaultProfile } from "./defaults";

export async function ensureSeedData(): Promise<void> {
  const hasProfile = await db.settings.get("profile");
  const hasPrefs = await db.settings.get("prefs");
  if (!hasProfile) await db.settings.put({ key: "profile", value: defaultProfile });
  if (!hasPrefs) await db.settings.put({ key: "prefs", value: defaultPrefs });
}
