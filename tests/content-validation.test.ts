import { describe, expect, it } from "vitest";
import { validateContentPack } from "../lib/content/validation";

const entry = {
  id: "remote-entry-1",
  category: "morning",
  title: "ذكر موثق",
  body: "نص الذكر",
  repetition: "ثلاث مرات",
  sourceName: "صحيح البخاري",
  sourceReference: "حديث 1",
  sourceUrl: "https://example.org/hadith/1",
  authenticity: "صحيح",
};

describe("validateContentPack", () => {
  it("accepts a versioned pack with a sourced item", () => {
    expect(validateContentPack({ version: "2", entries: [entry] })).toEqual({ version: "2", entries: [entry] });
  });

  it("accepts an empty published snapshot", () => {
    expect(validateContentPack({ version: "3", entries: [] }).entries).toEqual([]);
  });

  it("rejects unknown categories", () => {
    expect(() => validateContentPack({ version: "2", entries: [{ ...entry, category: "made-up" }] })).toThrow("تصنيف");
  });

  it("rejects religious content without source metadata", () => {
    expect(() => validateContentPack({ version: "2", entries: [{ ...entry, sourceReference: "" }] })).toThrow("مصدر ومرجع ورابط");
  });

  it("rejects non-http(s) source URLs", () => {
    expect(() => validateContentPack({ version: "2", entries: [{ ...entry, sourceUrl: "javascript:alert(1)" }] })).toThrow("مصدر ومرجع ورابط");
  });

  it("rejects reserved built-in identifiers and duplicates", () => {
    expect(() => validateContentPack({ version: "2", entries: [{ ...entry, id: "builtin-dua-1" }] })).toThrow("محجوز");
    expect(() => validateContentPack({ version: "2", entries: [entry, entry] })).toThrow("مكرر");
  });
});
