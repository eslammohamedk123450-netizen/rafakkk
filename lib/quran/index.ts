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
