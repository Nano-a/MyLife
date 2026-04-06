import { describe, expect, it } from "vitest";
import { computeDayScore } from "./dayScore.js";

describe("computeDayScore", () => {
  it("retourne 0 sans habitudes", () => {
    expect(computeDayScore([], [], "2026-04-05")).toBe(0);
  });

  it("compte une habitude oui/non complétée", () => {
    const habits = [
      {
        id: "h1",
        nom: "Test",
        icone: "✅",
        couleur: "#000",
        type: "oui_non" as const,
        frequence: "quotidien" as const,
        categorie: "x",
        createdAt: 0,
      },
    ];
    const completions = [{ habitId: "h1", date: "2026-04-05", fait: true }];
    expect(computeDayScore(habits, completions, "2026-04-05")).toBe(100);
  });
});
