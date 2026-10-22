import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  QURAN_ATTRIBUTION,
  getQuranPage,
  getSurahStartPage,
  QURAN_PAGE_COUNT,
  QURAN_SURAHS,
} from "../lib/quran";

describe("bundled Tanzil Quran data", () => {
  it("contains the full set of 114 surahs and 6,236 ayahs", () => {
    expect(QURAN_SURAHS).toHaveLength(114);
    expect(QURAN_SURAHS.reduce((sum, surah) => sum + surah.verseCount, 0)).toBe(6236);
  });

  it("contains 604 populated Medina Mushaf pages", () => {
    expect(QURAN_PAGE_COUNT).toBe(604);
    for (let page = 1; page <= QURAN_PAGE_COUNT; page += 1) {
      expect(getQuranPage(page).length).toBeGreaterThan(0);
    }
  });

  it("preserves every source verse verbatim and in canonical order", () => {
    const sourceVerses = readFileSync(resolve(process.cwd(), "assets/quran/tanzil-uthmani.txt"), "utf8")
      .split(/\r?\n/)
      .filter((line) => /^\d+\|\d+\|/.test(line))
      .map((line) => {
        const [surah, ayah, ...textParts] = line.split("|");
        return [Number(surah), Number(ayah), textParts.join("|")];
      });
    const bundledVerses = Array.from({ length: QURAN_PAGE_COUNT }, (_, index) => getQuranPage(index + 1))
      .flat()
      .map((verse) => [verse.surah, verse.ayah, verse.text]);

    expect(bundledVerses).toEqual(sourceVerses);
  });

  it("carries the current source attribution and license notice", () => {
    expect(QURAN_ATTRIBUTION).toContain("Copyright (C) 2007-2026 Tanzil Project");
    expect(QURAN_ATTRIBUTION).toContain("Creative Commons Attribution 3.0");
  });

  it("keeps the canonical first and last verses at the ends of the page index", () => {
    expect(getQuranPage(1)[0]).toMatchObject({ surah: 1, ayah: 1 });
    expect(getQuranPage(604).at(-1)).toMatchObject({ surah: 114, ayah: 6 });
  });

  it("maps surah starts to the metadata page", () => {
    expect(getSurahStartPage(1)).toBe(1);
    expect(getSurahStartPage(2)).toBe(2);
    expect(getSurahStartPage(114)).toBe(604);
    expect(getSurahStartPage(0)).toBeNull();
  });

  it("returns no data for out-of-range page numbers", () => {
    expect(getQuranPage(0)).toEqual([]);
    expect(getQuranPage(605)).toEqual([]);
  });
});
