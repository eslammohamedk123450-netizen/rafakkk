import { describe, expect, it } from "vitest";
import { calculateQuranDayProgress, getQuranProgressHistory } from "../lib/quran/progress";

describe("Quran progress units", () => {
  it("ignores saved progress tagged with a different unit", () => {
    expect(calculateQuranDayProgress({
      mode: "pages",
      savedProgress: 30,
      savedMode: "minutes",
      pagesReadToday: 2,
    })).toBe(2);
  });

  it("uses saved progress only when its unit matches the current plan", () => {
    expect(calculateQuranDayProgress({ mode: "minutes", savedProgress: 20, savedMode: "minutes" })).toBe(20);
    expect(calculateQuranDayProgress({ mode: "juz", savedProgress: 20, savedMode: "minutes" })).toBe(0);
  });

  it("combines uniquely marked pages with compatible page-plan progress", () => {
    expect(calculateQuranDayProgress({
      mode: "pages",
      savedProgress: 2,
      savedMode: "pages",
      pagesReadToday: 4,
    })).toBe(4);
  });

  it("filters achievement history by unit and includes marked pages for page plans", () => {
    const history = getQuranProgressHistory(
      "pages",
      { "2026-10-22": 40, "2026-10-21": 3 },
      { "2026-10-22": "minutes", "2026-10-21": "pages" },
      { "2026-10-22": [8, 9, 9] },
    );
    expect(history).toEqual({ "2026-10-22": 2, "2026-10-21": 3 });
  });
});
