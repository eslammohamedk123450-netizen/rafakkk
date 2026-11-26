import { useMemo, useState } from "react";
import { Linking, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { AppScreen, ScreenHeading, SulyButton, SulyCard, SulyInput, useSulyTheme } from "@/components/suly-ui";
import { localDateKey, useAppStore } from "@/lib/app-store";
import {
  getQuranPage,
  getSurahStartPage,
  getQuranPageForVerse,
  QURAN_LICENSE_URL,
  QURAN_PAGE_COUNT,
  QURAN_SOURCE_URL,
  QURAN_SURAHS,
} from "@/lib/quran";
import { getTafsirAyah, tafsirDisplayText, TAFSIR_SOURCE } from "@/lib/quran/tafsir";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const RECITERS_API = "https://mp3quran.net/api/v3/reciters?language=ar";
type ReaderReciter = { id: number; name: string; moshaf?: { id: number; name: string; server: string; surah_list?: string }[] };

function QuranAudioBar({ surahId, surahName }: { surahId: number; surahName: string }) {
  const { colors } = useSulyTheme();
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [reciters, setReciters] = useState<ReaderReciter[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }).catch(() => undefined);
    fetch(RECITERS_API).then((response) => {
      if (!response.ok) throw new Error("reciters");
      return response.json();
    }).then((data) => {
      if (!active) return;
      const list: ReaderReciter[] = Array.isArray(data?.reciters) ? data.reciters.filter((item: ReaderReciter) => item.moshaf?.some((edition) => edition.server)) : [];
      setReciters(list);
      if (list.length) setSelectedId(list[0].id);
    }).catch(() => { if (active) setNotice("تعذر تحميل القراء. تحقق من الإنترنت."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selected = reciters.find((item) => item.id === selectedId) ?? reciters[0];
  const edition = selected?.moshaf?.find((item) => item.server);
  const playCurrentSurah = () => {
    if (!edition?.server) { setNotice("لا يوجد تسجيل متاح لهذا القارئ."); return; }
    const available = edition.surah_list?.split(",").map(Number);
    if (available?.length && !available.includes(surahId)) { setNotice("السورة الحالية غير متاحة لهذا المصحف الصوتي."); return; }
    const url = `${edition.server.replace(/\\/$/, "")}/${String(surahId).padStart(3, "0")}.mp3`;
    try {
      player.replace(url);
      player.setActiveForLockScreen(true, { title: `سورة ${surahName}`, artist: selected.name, albumTitle: "رفيقك نحو الالتزام" });
      player.play();
      setNotice("");
    } catch {
      setNotice("تعذر تشغيل التلاوة حاليًا.");
    }
  };

  return (
    <SulyCard style={{ gap: 10, borderColor: colors.gold + "66" }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
        <MaterialCommunityIcons name="headphones" size={24} color={colors.gold} />
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>الاستماع مع القراءة</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>استمع للسورة الحالية وأنت تقرأ المصحف</Text>
        </View>
      </View>
      <Pressable onPress={() => setPickerOpen(true)} style={{ padding: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: "row-reverse", justifyContent: "space-between" }}>
        <Text style={{ color: colors.text, fontWeight: "700" }}>{selected?.name ?? "اختيار القارئ"}</Text>
        <Text style={{ color: colors.gold }}>تغيير القارئ</Text>
      </Pressable>
      <View style={{ flexDirection: "row-reverse", gap: 8 }}>
        <View style={{ flex: 1 }}><SulyButton title={status.playing ? "إيقاف مؤقت" : "استمع للسورة"} onPress={() => status.playing ? player.pause() : playCurrentSurah()} disabled={loading || !selected} /></View>
        <View style={{ flex: 1 }}><SulyButton title="إيقاف" secondary onPress={() => { player.pause(); void player.seekTo(0).catch(() => undefined); }} disabled={!status.playing && status.currentTime === 0} /></View>
      </View>
      {loading ? <ActivityIndicator color={colors.gold} /> : null}
      {status.isBuffering ? <Text style={{ color: colors.muted, textAlign: "right", fontSize: 11 }}>جارٍ تحميل التلاوة...</Text> : null}
      {notice ? <Text style={{ color: colors.muted, textAlign: "right", fontSize: 11 }}>{notice}</Text> : null}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)", padding: 12 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, maxHeight: "75%", padding: 15 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Pressable onPress={() => setPickerOpen(false)}><Text style={{ color: colors.gold }}>إغلاق</Text></Pressable>
              <Text style={{ color: colors.text, fontWeight: "900", fontSize: 17 }}>اختر القارئ</Text>
            </View>
            <ScrollView>
              {reciters.map((item) => <Pressable key={item.id} onPress={() => { setSelectedId(item.id); setPickerOpen(false); player.pause(); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: selectedId === item.id ? colors.gold : colors.text, textAlign: "right", fontWeight: "700" }}>{item.name}</Text>
              </Pressable>)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SulyCard>
  );
}

function arabicNumber(value: number) {
  return `${value}`.replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)]);
}

function clampPage(value: number) {
  return Math.max(1, Math.min(QURAN_PAGE_COUNT, value));
}

export default function QuranReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ surah?: string; ayah?: string }>();
  const requestedSurah = Number(params.surah);
  const requestedAyah = Number(params.ayah);
  const { store, updateStore } = useAppStore();
  const { colors } = useSulyTheme();
  const requestedPage = Number.isInteger(requestedSurah) && requestedSurah > 0 ? (Number.isInteger(requestedAyah) && requestedAyah > 0 ? getQuranPageForVerse(requestedSurah, requestedAyah) : getSurahStartPage(requestedSurah)) : null;
  const page = clampPage(requestedPage ?? store.quranReader.lastPage ?? 1);
  useEffect(() => { if (requestedPage) goToPage(requestedPage); }, [params.surah, params.ayah]);
  const [pageDraft, setPageDraft] = useState<string | null>(null);
  const [surahPickerVisible, setSurahPickerVisible] = useState(false);
  const fontSize = store.quranReader.fontSize ?? 27;
  const [notice, setNotice] = useState("");
  const [selectedTafsir, setSelectedTafsir] = useState<{ surah: number; ayah: number } | null>(null);
  const [tafsirText, setTafsirText] = useState("");
  const [tafsirFootnotes, setTafsirFootnotes] = useState("");
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirError, setTafsirError] = useState("");
  useEffect(() => {
    if (!selectedTafsir) return;
    let active = true;
    setTafsirLoading(true);
    setTafsirError("");
    setTafsirText("");
    setTafsirFootnotes("");
    getTafsirAyah(selectedTafsir.surah, selectedTafsir.ayah)
      .then((result) => {
        if (active) {
          setTafsirText(tafsirDisplayText(result.translation));
          setTafsirFootnotes(tafsirDisplayText(result.footnotes));
        }
      })
      .catch((error) => {
        if (active) setTafsirError(error instanceof Error ? error.message : "حدث خطأ أثناء تحميل التفسير.");
      })
      .finally(() => { if (active) setTafsirLoading(false); });
    return () => { active = false; };
  }, [selectedTafsir?.surah, selectedTafsir?.ayah]);
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
        khatmaPages: pageIsRead ? current.quranReader.khatmaPages : [...new Set([...current.quranReader.khatmaPages, page])].sort((a, b) => a - b),
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

      <QuranAudioBar surahId={currentSurah?.id ?? 1} surahName={currentSurah?.name ?? "الفاتحة"} />

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
            <Text key={`${verse.surah}:${verse.ayah}`} onPress={() => setSelectedTafsir({ surah: verse.surah, ayah: verse.ayah })} accessibilityRole="button">
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
      <Modal visible={Boolean(selectedTafsir)} transparent animationType="slide" onRequestClose={() => setSelectedTafsir(null)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.65)" }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "78%", gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Pressable onPress={() => setSelectedTafsir(null)}><Text style={{ color: colors.muted }}>إغلاق ✕</Text></Pressable>
              <Text style={{ color: colors.gold, fontWeight: "900", fontSize: 18 }}>تفسير الآية</Text>
            </View>
            <Text style={{ color: colors.text, textAlign: "right", fontWeight: "700" }}>
              {selectedTafsir ? `${QURAN_SURAHS.find((item) => item.id === selectedTafsir.surah)?.name ?? "السورة"} · الآية ${arabicNumber(selectedTafsir.ayah)}` : ""}
            </Text>
            <ScrollView contentContainerStyle={{ gap: 10 }}>
              <Text style={{ color: colors.gold, textAlign: "right", fontWeight: "900" }}>التفسير الميسّر</Text>
              {tafsirLoading ? <Text style={{ color: colors.muted, textAlign: "right" }}>جاري تحميل التفسير…</Text> : null}
              {tafsirError ? <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 24 }}>{tafsirError} تأكد من اتصال الإنترنت ثم أعد الضغط على الآية.</Text> : null}
              {tafsirText ? <Text style={{ color: colors.text, textAlign: "right", lineHeight: 30, fontSize: 16 }}>{tafsirText}</Text> : null}
              {tafsirFootnotes ? <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 24, fontSize: 12 }}>{tafsirFootnotes}</Text> : null}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 9, gap: 4 }}>
                <Text style={{ color: colors.gold, textAlign: "right", fontWeight: "800", fontSize: 12 }}>المصدر: التفسير الميسّر</Text>
                <Text style={{ color: colors.muted, textAlign: "right", fontSize: 11, lineHeight: 19 }}>{TAFSIR_SOURCE.credit} · النسخة {TAFSIR_SOURCE.version} · {TAFSIR_SOURCE.publisher}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </AppScreen>
  );
}
