import quranPayload from "../../assets/quran/quran-data.json";

type RawVerse = [number, number, string];

type QuranPayload = {
  metadata: {
    textSource: string;
    textVersion: string;
    metadataSource: string;
    metadataVersion: string;
    license: string;
    sourceUrl: string;
    licenseUrl: string;
    attribution: string;
    notice: string;
  };
  surahs: Array<{
    id: number;
    name: string;
    englishName: string;
    verseCount: number;
    startPage: number;
  }>;
  pages: RawVerse[][];
};

const quran = quranPayload as unknown as QuranPayload;

export type QuranVerse = {
  surah: number;
  ayah: number;
  text: string;
};

export type QuranSurah = QuranPayload["surahs"][number];

export const QURAN_ATTRIBUTION = quran.metadata.attribution;
export const QURAN_SOURCE_URL = quran.metadata.sourceUrl;
export const QURAN_LICENSE_URL = quran.metadata.licenseUrl;
export const QURAN_PAGE_COUNT = quran.pages.length;
export const QURAN_SURAH_COUNT = quran.surahs.length;
export const QURAN_SURAHS: QuranSurah[] = quran.surahs;

export function getQuranPage(pageNumber: number): QuranVerse[] {
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > QURAN_PAGE_COUNT) {
    return [];
  }
  return quran.pages[pageNumber - 1].map(([surah, ayah, text]) => ({
    surah,
    ayah,
    text,
  }));
}

export function getSurahStartPage(surahNumber: number): number | null {
  return quran.surahs.find((surah) => surah.id === surahNumber)?.startPage ?? null;
}

export function getSurahName(surahNumber: number): string {
  return quran.surahs.find((surah) => surah.id === surahNumber)?.name ?? "";
}

/** Find the local Mushaf page containing an ayah. */
export function getQuranPageForVerse(surahNumber: number, ayahNumber: number): number | null {
  if (!Number.isInteger(surahNumber) || !Number.isInteger(ayahNumber) || surahNumber < 1 || ayahNumber < 1) return null;
  const pageIndex = quran.pages.findIndex((page) => page.some(([surah, ayah]) => surah === surahNumber && ayah === ayahNumber));
  return pageIndex >= 0 ? pageIndex + 1 : null;
}

/** Search the complete local Quran text by surah name, ayah number or verse text. */
export type QuranSearchResult = QuranVerse & { page: number; surahName: string };

function normalizeQuranSearch(value: string): string {
  return value.normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[^\p{L}\p{N}: ]/gu, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

export function searchQuran(query: string, limit = 12): QuranSearchResult[] {
  const normalized = normalizeQuranSearch(query);
  if (normalized.length < 2) return [];
  const surahById = new Map(quran.surahs.map((surah) => [surah.id, surah]));
  const directVerse = normalized.match(/^(?:([0-9]{1,3})\s*[:：]\s*([0-9]{1,3})|(.+?)\s+([0-9]{1,3}))$/);
  const results: QuranSearchResult[] = [];
  quran.pages.forEach((pageVerses, pageIndex) => {
    for (const [surahId, ayah, text] of pageVerses) {
      const surah = surahById.get(surahId);
      if (!surah) continue;
      const verseText = normalizeQuranSearch(text);
      const surahName = normalizeQuranSearch(surah.name);
      let matches = verseText.includes(normalized) || surahName.includes(normalized);
      if (directVerse) {
        if (directVerse[1] && directVerse[2]) matches = surahId === Number(directVerse[1]) && ayah === Number(directVerse[2]);
        else if (directVerse[3] && directVerse[4]) matches = surahName.includes(normalizeQuranSearch(directVerse[3])) && ayah === Number(directVerse[4]);
      }
      if (matches) results.push({ surah: surahId, ayah, text, page: pageIndex + 1, surahName: surah.name });
    }
  });
  return results.slice(0, Math.max(1, Math.min(limit, 30)));
}