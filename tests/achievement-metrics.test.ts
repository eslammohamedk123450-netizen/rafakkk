import { describe, expect, it } from "vitest";
import { calculateAchievementSummary } from "../lib/achievement-metrics";

const emptyInput = {
  days: ["2026-10-22", "2026-10-21", "2026-10-20"],
  prayerLogs: {},
  quranHistory: {},
  tasbeehCounts: {},
  dhikrCounts: {},
  quranTarget: 5,
  dhikrGoal: null,
  tasbeehGoal: null,
};

describe("achievement metrics", () => {
  it("does not treat unrecorded prayer, dhikr, or tasbeeh days as failures", () => {
    const summary = calculateAchievementSummary(emptyInput);
    expect(summary.prayerRate).toBeNull();
    expect(summary.dhikrRate).toBeNull();
    expect(summary.tasbeehRate).toBeNull();
    expect(summary.score).toBeNull();
  });

  it("uses only recorded prayer entries and days containing actual dhikr/tasbeeh records", () => {
    const summary = calculateAchievementSummary({
      ...emptyInput,
      prayerLogs: { "2026-10-22": { fajr: "completed", dhuhr: "noted" } },
      quranHistory: { "2026-10-22": 1 },
      dhikrCounts: { "2026-10-22": { dhikr1: 3 } },
      tasbeehCounts: { "2026-10-22": 20 },
      dhikrGoal: 10,
      tasbeehGoal: 33,
    });
    expect(summary.prayerRecorded).toBe(2);
    expect(summary.prayerRate).toBe(50);
    expect(summary.quranRate).toBe(20);
    expect(summary.dhikrRate).toBe(30);
    expect(summary.tasbeehRate).toBe(61);
  });

  it("caps over-completion at 100% and keeps the personal score at or below 10", () => {
    const summary = calculateAchievementSummary({
      ...emptyInput,
      prayerLogs: { "2026-10-22": { fajr: "completed" } },
      quranHistory: { "2026-10-22": 12 },
      dhikrCounts: { "2026-10-22": { dhikr1: 500 } },
      tasbeehCounts: { "2026-10-22": 500 },
      dhikrGoal: 1,
      tasbeehGoal: 1,
    });
    expect(summary.quranRate).toBe(100);
    expect(summary.dhikrRate).toBe(100);
    expect(summary.tasbeehRate).toBe(100);
    expect(summary.score).toBe(10);
  });
});
