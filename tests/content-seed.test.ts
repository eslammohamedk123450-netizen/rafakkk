import { describe, expect, it } from "vitest";
import { BUILTIN_CONTENT } from "../lib/content/seed";

describe("offline religious content seed", () => {
  it("provides sourced entries for every built-in library category", () => {
    const requiredCategories = ["morning", "evening", "after_prayer", "sleep_wake", "istighfar", "salawat", "quran", "dua"];
    for (const category of requiredCategories) {
      const entries = BUILTIN_CONTENT.filter((entry) => entry.category === category);
      expect(entries.length, `missing built-in category: ${category}`).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry.sourceName.trim()).not.toBe("");
        expect(entry.sourceReference.trim()).not.toBe("");
        expect(entry.sourceUrl).toMatch(/^https:\/\//);
      }
    }
  });

  it("keeps the Qur'an verse reference and source together", () => {
    const verse = BUILTIN_CONTENT.find((entry) => entry.id === "builtin-quran-001");
    expect(verse?.sourceReference).toBe("سورة الرعد، الآية 28");
    expect(verse?.sourceUrl).toBe("https://quran.com/13/28");
  });
});
