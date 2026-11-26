import { useMemo, useState } from "react";
import { Linking, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AppScreen, ScreenHeading, SulyButton, SulyCard, SulyInput, useSulyTheme } from "@/components/suly-ui";
import { localDateKey, useAppStore } from "@/lib/app-store";
import {
  getQuranPage,
  getSurahStartPage,
  QURAN_LICENSE_URL,
  QURAN_PAGE_COUNT,
  QURAN_SOURCE_URL,
  QURAN_SURAHS,
} from "@/lib/quran";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function arabicNumber(value: number) {
  return `${value}`.replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)]);
}

function clampPage(value: number) {
  return Math.max(1, Math.min(QURAN_PAGE_COUNT, value));
}

export default function QuranReaderScreen() {
  const router = useRouter();
  const { store, updateStore } = useAppStore();
  const { colors } = useSulyTheme();
  const page = clampPage(store.quranReader.lastPage || 1);
  const [pageDraft, setPageDraft] = useState<string | null>(null);
  const [surahPickerVisible, setSurahPickerVisible] = useState(false);
  const fontSize = store.quranReader.fontSize ?? 27;
  const [notice, setNotice] = useState("");
  const today = localDateKey(new Date(), store.location?.timeZone);
  const verses = useMemo(() => getQuranPage(page), [page]);
  const currentSurah = QURAN_SURAHS.find((surah) => surah.id === verses[0]?.surah);
  const pagesReadToday = store.quranReader.pagesReadByDate[today] ?? [];
  const pageIsRead = pagesReadToday.includes(page);
  const pageIsBookmarked = store.quranReader.bookmarkPage === page;

  const goToPage = (target: number) => {
    const nextPage = clampPage(target);
    setPageDraft(null);
    setNotice("");
    updateStore((current) => ({
      ...current,
      quranReader: { ...current.quranReader, lastPage: nextPage },
    }));
  };

  const submitPage = () => {
    const parsed = Number.parseInt(pageDraft ?? `${page}`, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > QURAN_PAGE_COUNT) {
      setNotice(`أدخل رقم صفحة من ١ إلى ${arabicNumber(QURAN_PAGE_COUNT)}.`);
      return;
    }
    goToPage(parsed);
  };

  const togglePageRead = () => {
    const nextPages = new Set(pagesReadToday);
    if (pageIsRead) nextPages.delete(page);
    else nextPages.add(page);
    updateStore((current) => ({
      ...current,
      quranReader: {
        ...current.quranReader,
        lastPage: page,
        pagesReadByDate: {
          ...current.quranReader.pagesReadByDate,
          [today]: [...nextPages].sort((a, b) => a - b),
        },
      },
    }));
    setNotice(pageIsRead ? "أُزيل تسجيل قراءة الصفحة لهذا اليوم." : "سُجلت الصفحة ضمن قراءة اليوم.");
  };

  const toggleBookmark = () => {
    updateStore((current) => ({
      ...current,
      quranReader: {
        ...current.quranReader,
        lastPage: page,
        bookmarkPage: current.quranReader.bookmarkPage === page ? null : page,
      },
    }));
    setNotice(pageIsBookmarked ? "أُزيلت العلامة المرجعية." : "حُفظت هذه الصفحة كعلامة مرجعية.");
  };

  const openSurah = (surahNumber: number) => {
    const startPage = getSurahStartPage(surahNumber);
    setSurahPickerVisible(false);
    if (startPage) goToPage(startPage);
  };

  const openExternal = (url: string) => {
    void Linking.openURL(url).catch(() => setNotice("تعذر فتح صفحة المصدر على هذا الجهاز."));
  };

  return (
    <AppScreen>
      <ScreenHeading
        title="المصحف الشريف"
        subtitle="قراءة محلية محفوظة على هذا الجهاز"
        action={<Pressable onPress={() => router.back()} style={{ padding: 8 }}><Text style={{ color: colors.gold, fontWeight: "700" }}>الورد</Text></Pressable>}
      />

      <SulyCard>
        <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}>{currentSurah?.name ?? "سورة"}</Text>
          <Text style={{ color: colors.muted }}>الصفحة {arabicNumber(page)} من {arabicNumber(QURAN_PAGE_COUNT)}</Text>
        </View>
        <View style={{ flexDirection: "row-reverse", gap: 8 }}>
          <View style={{ flex: 1 }}><SulyButton title="السورة" secondary onPress={() => setSurahPickerVisible(true)} /></View>
          <View style={{ flex: 1 }}><SulyButton title="السابقة" secondary disabled={page <= 1} onPress={() => goToPage(page - 1)} /></View>
          <View style={{ flex: 1 }}><SulyButton title="التالية" secondary disabled={page >= QURAN_PAGE_COUNT} onPress={() => goToPage(page + 1)} /></View>
        </View>
        <View style={{ flexDirection: "row-reverse", alignItems: "flex-end", gap: 8 }}>
          <View style={{ flex: 1 }}><SulyInput label="اذهب إلى صفحة" value={pageDraft ?? `${page}`} onChangeText={setPageDraft} keyboardType="number-pad" returnKeyType="go" onSubmitEditing={submitPage} /></View>
          <View style={{ width: 105 }}><SulyButton title="انتقل" onPress={submitPage} /></View>
        </View>
        <View style={{ flexDirection: "row-reverse", gap: 8 }}>
          <View style={{ flex: 1 }}><SulyButton title={pageIsRead ? "إلغاء تسجيل الصفحة" : "سجّل الصفحة مقروءة"} secondary onPress={togglePageRead} /></View>
          <View style={{ flex: 1 }}><SulyButton title={pageIsBookmarked ? "إزالة العلامة" : "احفظ علامة"} secondary onPress={toggleBookmark} /></View>
        </View>
        {store.quranReader.bookmarkPage !== null ? <SulyButton title={`العودة إلى العلامة · الصفحة ${arabicNumber(store.quranReader.bookmarkPage)}`} secondary onPress={() => goToPage(store.quranReader.bookmarkPage!)} /> : null}
        <Text style={{ color: colors.muted, textAlign: "right", fontSize: 13 }}>
          قرأت {arabicNumber(pagesReadToday.length)} صفحة اليوم. {store.quranReader.bookmarkPage ? `علامتك عند الصفحة ${arabicNumber(store.quranReader.bookmarkPage)}.` : "يمكنك وضع علامة للعودة إلى موضع تختاره."}
        </Text>
        {notice ? <Text style={{ color: colors.gold, textAlign: "right" }}>{notice}</Text> : null}
      </SulyCard>

      <SulyCard style={{ backgroundColor: colors.card, paddingHorizontal: 18, paddingVertical: 24 }}>
        <View style={{ alignItems: "center", marginBottom: 16, gap: 4 }}>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>{currentSurah?.name ?? ""}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>صفحة {arabicNumber(page)}</Text>
        </View>
        <Text
          style={{
            color: colors.text,
            fontFamily: Platform.OS === "android" ? "serif" : undefined,
            fontSize,
            lineHeight: Math.round(fontSize * 2.05),
            textAlign: "justify",
            writingDirection: "rtl",
          }}
        >
          {verses.map((verse) => (
            <Text key={`${verse.surah}:${verse.ayah}`}>
              {verse.text}{" "}
              <Text style={{ color: colors.gold, fontSize: Math.round(fontSize * 0.72) }}>
                ﴿{arabicNumber(verse.ayah)}﴾
              </Text>{" "}
            </Text>
          ))}
        </Text>
        {verses.length === 0 ? <Text style={{ color: colors.muted, textAlign: "center" }}>تعذر تحميل هذه الصفحة من البيانات المحلية.</Text> : null}
        <View style={{ flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 18 }}>
          <Pressable onPress={() => updateStore((current) => ({ ...current, quranReader: { ...current.quranReader, fontSize: Math.max(20, (current.quranReader.fontSize ?? 27) - 2) } }))} accessibilityRole="button" style={{ padding: 8 }}><Text style={{ color: colors.gold, fontWeight: "700" }}>أصغر</Text></Pressable>
          <Text style={{ color: colors.muted }}>حجم الخط</Text>
          <Pressable onPress={() => updateStore((current) => ({ ...current, quranReader: { ...current.quranReader, fontSize: Math.min(36, (current.quranReader.fontSize ?? 27) + 2) } }))} accessibilityRole="button" style={{ padding: 8 }}><Text style={{ color: colors.gold, fontWeight: "700" }}>أكبر</Text></Pressable>
        </View>
      </SulyCard>

      <View style={{ alignItems: "center", gap: 6, paddingHorizontal: 8, paddingBottom: 12 }}>
        <Text style={{ color: colors.muted, textAlign: "center", fontSize: 12 }}>نص الرسم العثماني من مشروع Tanzil، محفوظ في التطبيق للقراءة دون إنترنت، ولم يُغيّر.</Text>
        <View style={{ flexDirection: "row-reverse", gap: 18 }}>
          <Pressable onPress={() => openExternal(QURAN_SOURCE_URL)}><Text style={{ color: colors.gold, fontSize: 12, textDecorationLine: "underline" }}>المصدر Tanzil</Text></Pressable>
          <Pressable onPress={() => openExternal(QURAN_LICENSE_URL)}><Text style={{ color: colors.gold, fontSize: 12, textDecorationLine: "underline" }}>الترخيص CC BY 3.0</Text></Pressable>
        </View>
      </View>

      <Modal visible={surahPickerVisible} transparent animationType="slide" onRequestClose={() => setSurahPickerVisible(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)", padding: 12 }}>
          <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 22, maxHeight: "84%", overflow: "hidden" }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}>اختر سورة</Text>
              <Pressable onPress={() => setSurahPickerVisible(false)}><Text style={{ color: colors.gold, fontWeight: "700" }}>إغلاق</Text></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {QURAN_SURAHS.map((surah) => (
                <Pressable
                  key={surah.id}
                  onPress={() => openSurah(surah.id)}
                  style={{ paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}
                >
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>{arabicNumber(surah.id)}. {surah.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{arabicNumber(surah.verseCount)} آية · صفحة {arabicNumber(surah.startPage)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}
