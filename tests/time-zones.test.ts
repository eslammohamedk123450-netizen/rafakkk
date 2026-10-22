import { describe, expect, it } from "vitest";
import { localDateTimeToUtc } from "../lib/time-zones";

describe("localDateTimeToUtc", () => {
  it("converts a fixed-offset city wall time to the corresponding instant", () => {
    expect(localDateTimeToUtc("2026-01-01", "06:30", "Asia/Riyadh", 0)?.toISOString()).toBe("2026-01-01T03:30:00.000Z");
  });

  it("does not invent an instant for a wall time skipped by spring DST", () => {
    expect(localDateTimeToUtc("2026-03-08", "02:30", "America/New_York", 0)).toBeNull();
  });

  it("selects the second future occurrence in a fall-back overlap when the first has passed", () => {
    expect(localDateTimeToUtc("2026-11-01", "01:30", "America/New_York", Date.parse("2026-11-01T05:45:00Z"))?.toISOString()).toBe("2026-11-01T06:30:00.000Z");
  });

  it("rejects invalid dates, clocks, and time-zone identifiers", () => {
    expect(localDateTimeToUtc("2026-02-30", "08:30", "Asia/Riyadh", 0)).toBeNull();
    expect(localDateTimeToUtc("2026-01-01", "24:00", "Asia/Riyadh", 0)).toBeNull();
    expect(localDateTimeToUtc("2026-01-01", "08:30", "Not/AZone", 0)).toBeNull();
  });
});
