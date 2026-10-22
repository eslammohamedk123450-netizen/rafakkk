import { describe, expect, it } from "vitest";
import { isNewerPublishedVersion, validateContentPack } from "../lib/content/validation";

describe("published content versions", () => {
  it("treats the first numeric server release as newer than built-in content", () => {
    expect(isNewerPublishedVersion("1", "builtin-1")).toBe(true);
  });

  it("rejects equal and older server versions", () => {
    expect(isNewerPublishedVersion("5", "5")).toBe(false);
    expect(isNewerPublishedVersion("4", "5")).toBe(false);
  });

  it("rejects invalid versions rather than risking a local downgrade", () => {
    expect(isNewerPublishedVersion("builtin-1", "5")).toBe(false);
    expect(isNewerPublishedVersion("not-a-version", "builtin-1")).toBe(false);
    expect(() => validateContentPack({ version: "builtin-1", entries: [] })).toThrow("رقم إصدار");
  });
});
