import AsyncStorage from "@react-native-async-storage/async-storage";

export const TAFSIR_SOURCE = {
  title: "التفسير الميسّر",
  credit: "إعداد لجنة علمية بمجمع الملك فهد لطباعة المصحف الشريف",
  publisher: "QuranEnc.com",
  version: "1.0.0",
  url: "https://quranenc.com/en/browse/arabic_moyassar",
};

export type TafsirAyah = {
  translation: string;
  footnotes: string;
  version: string;
};

const cacheKey = (surah: number, ayah: number) => `rafik:tafsir:muyassar:v1:${surah}:${ayah}`;

export async function getTafsirAyah(surah: number, ayah: number): Promise<TafsirAyah> {
  const key = cacheKey(surah, ayah);
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached) as TafsirAyah;
      if (typeof parsed.translation === "string" && parsed.translation.trim()) return parsed;
    }
  } catch {
    // A damaged cache entry must never prevent loading the source text.
  }

  const response = await fetch(`https://quranenc.com/api/v1/translation/aya/arabic_moyassar/${surah}/${ayah}`);
  if (!response.ok) throw new Error("تعذر جلب التفسير من المصدر.");
  const payload = await response.json();
  const result = payload?.result;
  if (!result || typeof result.translation !== "string" || !result.translation.trim()) {
    throw new Error("لا يتوفر تفسير لهذه الآية في المصدر حاليًا.");
  }

  const record: TafsirAyah = {
    translation: result.translation,
    footnotes: typeof result.footnotes === "string" ? result.footnotes : "",
    version: TAFSIR_SOURCE.version,
  };
  try {
    await AsyncStorage.setItem(key, JSON.stringify(record));
  } catch {
    // Reading still succeeds if the device cannot persist the cache.
  }
  return record;
}

/** Convert source HTML formatting to safe React Native text while retaining its wording. */
export function tafsirDisplayText(value: string): string {
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
