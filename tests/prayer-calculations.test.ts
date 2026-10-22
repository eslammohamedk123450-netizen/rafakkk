import { describe, expect, it } from "vitest";
import { calculatePrayerTimes, formatPrayerTime, getNextPrayer } from "../lib/prayer/calculations";

describe("local prayer-time calculations", () => {
  const date = new Date(Date.UTC(2026, 9, 22, 12));
  const cairo = { latitude: 30.0444, longitude: 31.2357 };

  it("returns five valid, chronologically ordered prayer times", () => {
    const times = calculatePrayerTimes(cairo.latitude, cairo.longitude, date, "Egyptian", "shafi");
    const ordered = [times.fajr, times.dhuhr, times.asr, times.maghrib, times.isha];
    expect(ordered.every((time) => Number.isFinite(time.getTime()))).toBe(true);
    expect(ordered.every((time, index) => index === 0 || time.getTime() > ordered[index - 1].getTime())).toBe(true);
  });

  it("uses a later afternoon time for the Hanafi madhab", () => {
    const shafi = calculatePrayerTimes(cairo.latitude, cairo.longitude, date, "Egyptian", "shafi");
    const hanafi = calculatePrayerTimes(cairo.latitude, cairo.longitude, date, "Egyptian", "hanafi");
    expect(hanafi.asr.getTime()).toBeGreaterThan(shafi.asr.getTime());
  });

  it("selects the next prayer from absolute instants and formats in the chosen zone", () => {
    const times = calculatePrayerTimes(cairo.latitude, cairo.longitude, date, "Egyptian", "shafi");
    expect(getNextPrayer(times, new Date(times.fajr.getTime() - 60_000))?.id).toBe("fajr");
    expect(getNextPrayer(times, new Date(times.isha.getTime() + 60_000))).toBeNull();
    expect(formatPrayerTime(times.dhuhr, "Africa/Cairo")).toMatch(/\d/);
  });
});
