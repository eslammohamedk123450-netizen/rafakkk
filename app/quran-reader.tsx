import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect } from "react";
import { ActivityIndicator } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { AppScreen, ScreenHeading, SulyButton, SulyCard, useSulyTheme } from "@/components/suly-ui";
import { useAppStore } from "@/lib/app-store";
import {
  getQuranPage,
  getSurahStartPage,
  getQuranPageForVerse,
  QURAN_PAGE_COUNT,
  QURAN_SURAHS,
  searchQuran,
} from "@/lib/quran";
import { getTafsirAyah, tafsirDisplayText } from "@/lib/quran/tafsir";

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
  const [expanded, setExpanded] = useState(false);
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
    const url = `${edition.server.replace(/\/+$/, "")}/${String(surahId).padStart(3, "0")}.mp3`;
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
    <SulyCard style={{ gap: 9, borderColor: colors.gold + "66", paddingVertical: 12 }}>
      <Pressable onPress={() => setExpanded((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded }} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 9 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
          <MaterialCommunityIcons name="headphones" size={22} color={colors.gold} />
        </View>
        <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 15 }}>الاستماع مع القراءة</Text>
          <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11 }}>{selected?.name ?? (loading ? "جارٍ تحميل القراء..." : "اختر قارئك المفضل")}</Text>
        </View>
        <MaterialCommunityIcons name={expanded ? "chevron-up" : "chevron-down"} size={21} color={colors.muted} />
        <Pressable onPress={(event) => { event.stopPropagation(); status.playing ? player.pause() : playCurrentSurah(); }} accessibilityRole="button" accessibilityLabel={status.playing ? "إيقاف التلاوة مؤقتًا" : "تشغيل السورة"} style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" }}>
          <MaterialCommunityIcons name={status.playing ? "pause" : "play"} size={22} color="#17392F" />
        </Pressable>
      </Pressable>
      {expanded ? <>
      <Pressable onPress={() => setPickerOpen(true)} style={{ padding: 11, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: "row-reverse", justifyContent: "space-between" }}>
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
      </> : null}
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
  const [searchQuery, setSearchQuery] = useState("");
  const searchResults = useMemo(() => searchQuran(searchQuery, 10), [searchQuery]);
  const [surahPickerVisible, setSurahPickerVisible] = useState(false);
  const [surahSearch, setSurahSearch] = useState("");
  const filteredSurahs = useMemo(() => {
    const query = surahSearch.trim().replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي");
    return query ? QURAN_SURAHS.filter((surah) => surah.name.replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").includes(query)) : QURAN_SURAHS;
  }, [surahSearch]);
  const [pagePickerVisible, setPagePickerVisible] = useState(false);
  const [readerMenuVisible, setReaderMenuVisible] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ surah: number; ayah: number } | null>(() => store.quranReader.bookmarkPage === page && store.quranReader.bookmarkSurah && store.quranReader.bookmarkAyah ? { surah: store.quranReader.bookmarkSurah, ayah: store.quranReader.bookmarkAyah } : null);
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
  const verses = useMemo(() => getQuranPage(page), [page]);
  const currentSurah = QURAN_SURAHS.find((surah) => surah.id === verses[0]?.surah);
  const pageIsBookmarked = store.quranReader.bookmarkPage === page;

  const goToPage = (target: number) => {
    const nextPage = clampPage(target);
    setCurrentPosition(null);
    setNotice("");
    updateStore((current) => ({
      ...current,
      quranReader: { ...current.quranReader, lastPage: nextPage },
    }));
  };

  const openSurah = (surahNumber: number) => {
    const startPage = getSurahStartPage(surahNumber);
    setSurahPickerVisible(false);
    if (startPage) goToPage(startPage);
  };

  return (
    <AppScreen>
      <ScreenHeading
        title="المصحف الشريف"
        subtitle="قراءة محلية محفوظة على هذا الجهاز"
        action={<Pressable onPress={() => router.back()} style={{ padding: 8 }}><Text style={{ color: colors.gold, fontWeight: "700" }}>الورد</Text></Pressable>}
      />

      <View style={{ gap: 6 }}>
        <View style={{ minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surface, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 11, gap: 8 }}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.gold} />
          <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="ابحث في السور والآيات..." placeholderTextColor={colors.muted} returnKeyType="search" style={{ flex: 1, minHeight: 42, color: colors.text, textAlign: "right", fontSize: 14, paddingVertical: 4 }} accessibilityLabel="البحث في القرآن الكريم" />
          {searchQuery ? <Pressable onPress={() => setSearchQuery("")} accessibilityRole="button" accessibilityLabel="مسح البحث"><MaterialCommunityIcons name="close-circle" size={19} color={colors.muted} /></Pressable> : null}
        </View>
        {searchQuery.trim().length >= 2 ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: 13, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
            {searchResults.length ? searchResults.map((result) => (
              <Pressable key={`${result.surah}:${result.ayah}`} onPress={() => { goToPage(result.page); setSearchQuery(""); }} style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 3 }}>
                <Text style={{ color: colors.gold, textAlign: "right", fontSize: 12, fontWeight: "800" }}>{result.surahName} · الآية {arabicNumber(result.ayah)} · صفحة {arabicNumber(result.page)}</Text>
                <Text numberOfLines={2} style={{ color: colors.text, textAlign: "right", fontSize: 14, lineHeight: 24 }}>{result.text}</Text>
              </Pressable>
            )) : <Text style={{ color: colors.muted, textAlign: "right", padding: 12, fontSize: 13 }}>لا توجد نتائج مطابقة. جرّب اسم السورة أو جزءًا من الآية.</Text>}
          </View>
        ) : searchQuery.trim().length === 1 ? <Text style={{ color: colors.muted, textAlign: "right", fontSize: 11 }}>اكتب حرفًا آخر لبدء البحث.</Text> : null}
      </View>

      <QuranAudioBar surahId={currentSurah?.id ?? 1} surahName={currentSurah?.name ?? "الفاتحة"} />

      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 3 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
          <Pressable onPress={() => setReaderMenuVisible(true)} accessibilityRole="button" accessibilityLabel="قائمة المصحف" style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}><MaterialCommunityIcons name="menu" size={23} color={colors.gold} /></Pressable>
          <Pressable onPress={() => setPagePickerVisible(true)} accessibilityRole="button" accessibilityLabel="فهرس صفحات المصحف" style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}><MaterialCommunityIcons name="book-open-page-variant" size={22} color={colors.gold} /></Pressable>
          <Pressable onPress={() => { updateStore((current) => ({ ...current, quranReader: { ...current.quranReader, lastPage: page, bookmarkPage: page, bookmarkSurah: currentPosition?.surah ?? verses[0]?.surah ?? null, bookmarkAyah: currentPosition?.ayah ?? verses[0]?.ayah ?? null } })); setNotice("اتحفظ موضع القراءة. تقدر ترجع له من علامة الدبوس."); }} accessibilityRole="button" accessibilityLabel="حفظ موضع القراءة" style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: pageIsBookmarked ? colors.gold + "25" : colors.surface, borderWidth: 1, borderColor: pageIsBookmarked ? colors.gold : colors.border, alignItems: "center", justifyContent: "center" }}><MaterialCommunityIcons name="pin" size={22} color={colors.gold} /></Pressable>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}><Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>{currentSurah?.name ?? "المصحف"}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>صفحة {arabicNumber(page)} من {arabicNumber(QURAN_PAGE_COUNT)}</Text></View>
      </View>
      {notice ? <Text style={{ color: colors.gold, textAlign: "right", fontSize: 12 }}>{notice}</Text> : null}
      <View style={{ marginHorizontal: -10, backgroundColor: colors.surface, borderColor: colors.gold + "99", borderWidth: 2, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 14, gap: 10 }}>
        <View style={{ alignItems: "center", marginBottom: 4, gap: 6, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.gold + "66" }}>
          <Text style={{ color: colors.gold, fontSize: 12, fontWeight: "700" }}>۞ ۞ ۞</Text>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 21, letterSpacing: 0.2 }}>{currentSurah?.name ?? ""}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>الجزء من المصحف · صفحة {arabicNumber(page)}</Text>
        </View>
        <View style={{ paddingHorizontal: 2, paddingVertical: 6, width: "100%" }}>
        <Text
          style={{
            color: colors.text,
            fontFamily: Platform.OS === "android" ? "serif" : undefined,
            fontSize,
            lineHeight: Math.round(fontSize * 2.12),
            textAlign: "justify",
            writingDirection: "rtl",
          }}
        >
          {verses.map((verse) => (
            <Text key={`${verse.surah}:${verse.ayah}`} onPress={() => { setCurrentPosition({ surah: verse.surah, ayah: verse.ayah }); setSelectedTafsir({ surah: verse.surah, ayah: verse.ayah }); }} accessibilityRole="button">
              {verse.text}{" "}
              <Text style={{ color: colors.gold, fontSize: Math.round(fontSize * 0.72), backgroundColor: store.quranReader.bookmarkSurah === verse.surah && store.quranReader.bookmarkAyah === verse.ayah ? colors.gold + "22" : "transparent" }}>
                ﴿{arabicNumber(verse.ayah)}﴾
              </Text>{" "}
            </Text>
          ))}
        </Text>
        </View>
        {verses.length === 0 ? <Text style={{ color: colors.muted, textAlign: "center" }}>تعذر تحميل هذه الصفحة من البيانات المحلية.</Text> : null}
        <View style={{ flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 8 }}>
          <Pressable onPress={() => updateStore((current) => ({ ...current, quranReader: { ...current.quranReader, fontSize: Math.max(20, (current.quranReader.fontSize ?? 27) - 2) } }))} accessibilityRole="button" style={{ padding: 8 }}><Text style={{ color: colors.gold, fontWeight: "700" }}>أصغر</Text></Pressable>
          <Text style={{ color: colors.muted }}>حجم الخط</Text>
          <Pressable onPress={() => updateStore((current) => ({ ...current, quranReader: { ...current.quranReader, fontSize: Math.min(36, (current.quranReader.fontSize ?? 27) + 2) } }))} accessibilityRole="button" style={{ padding: 8 }}><Text style={{ color: colors.gold, fontWeight: "700" }}>أكبر</Text></Pressable>
        </View>
      </View>




      <View style={{ gap: 9, paddingHorizontal: 2, paddingBottom: 6 }}>
        <View style={{ height: 5, borderRadius: 99, backgroundColor: colors.border, overflow: "hidden", alignItems: "flex-end" }}>
          <View style={{ width: `${(page / QURAN_PAGE_COUNT) * 100}%`, height: "100%", backgroundColor: colors.gold, borderRadius: 99 }} />
        </View>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Pressable onPress={() => goToPage(page + 1)} disabled={page >= QURAN_PAGE_COUNT} accessibilityRole="button" accessibilityLabel="الصفحة التالية" style={{ minWidth: 94, minHeight: 42, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 5, opacity: page >= QURAN_PAGE_COUNT ? 0.35 : 1 }}>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gold} />
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>التالي</Text>
          </Pressable>
          <View style={{ alignItems: "center", gap: 2 }}>
            <Text style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}>{arabicNumber(page)} / {arabicNumber(QURAN_PAGE_COUNT)}</Text>
            <Text style={{ color: colors.muted, fontSize: 10 }}>تقدمك في المصحف</Text>
          </View>
          <Pressable onPress={() => goToPage(page - 1)} disabled={page <= 1} accessibilityRole="button" accessibilityLabel="الصفحة السابقة" style={{ minWidth: 94, minHeight: 42, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 5, opacity: page <= 1 ? 0.35 : 1 }}>
            <MaterialCommunityIcons name="chevron-left" size={20} color={colors.gold} />
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>السابق</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={readerMenuVisible} transparent animationType="fade" onRequestClose={() => setReaderMenuVisible(false)}>
        <Pressable onPress={() => setReaderMenuVisible(false)} style={{ flex: 1, justifyContent: "flex-start", backgroundColor: "rgba(0,0,0,0.55)", padding: 18, paddingTop: 95 }}>
          <Pressable onPress={() => undefined} style={{ backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 8, gap: 3 }}>
            {[
              { icon: "book-open-variant", label: "فهرس السور", action: () => { setReaderMenuVisible(false); setSurahPickerVisible(true); } },
              { icon: "view-grid-outline", label: "كل صفحات المصحف", action: () => { setReaderMenuVisible(false); setPagePickerVisible(true); } },
              { icon: "pin", label: "حفظ موضع القراءة الحالي", action: () => { updateStore((current) => ({ ...current, quranReader: { ...current.quranReader, lastPage: page, bookmarkPage: page, bookmarkSurah: currentPosition?.surah ?? verses[0]?.surah ?? null, bookmarkAyah: currentPosition?.ayah ?? verses[0]?.ayah ?? null } })); setReaderMenuVisible(false); setNotice("اتحفظ موضع القراءة الحالي."); } },
              { icon: "bookmark-multiple", label: store.quranReader.bookmarkPage ? "العودة لآخر علامة · صفحة " + arabicNumber(store.quranReader.bookmarkPage) : "لا توجد علامة محفوظة", action: () => { if (store.quranReader.bookmarkPage) { goToPage(store.quranReader.bookmarkPage); const saved = store.quranReader as typeof store.quranReader & { bookmarkSurah?: number | null; bookmarkAyah?: number | null }; if (saved.bookmarkSurah && saved.bookmarkAyah) setCurrentPosition({ surah: saved.bookmarkSurah, ayah: saved.bookmarkAyah }); } setReaderMenuVisible(false); } },
            ].map((item) => <Pressable key={item.label} onPress={item.action} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 13, borderRadius: 12 }}><MaterialCommunityIcons name={item.icon as any} size={21} color={colors.gold} /><Text style={{ color: colors.text, textAlign: "right", fontWeight: "700", flex: 1 }}>{item.label}</Text></Pressable>)}
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={pagePickerVisible} transparent animationType="slide" onRequestClose={() => setPagePickerVisible(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.62)", padding: 8 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, maxHeight: "88%", padding: 12, gap: 10 }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}><Text style={{ color: colors.text, fontWeight: "900", fontSize: 17 }}>صفحات المصحف</Text><Pressable onPress={() => setPagePickerVisible(false)}><Text style={{ color: colors.gold, fontWeight: "700" }}>إغلاق ✕</Text></Pressable></View>
            <Text style={{ color: colors.muted, textAlign: "right", fontSize: 11 }}>اضغط على معاينة الصفحة للانتقال إليها. المعاينات مصغّرات نصية وليست صورًا ممسوحة للمصحف.</Text>
            <ScrollView contentContainerStyle={{ flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
              {Array.from({ length: QURAN_PAGE_COUNT }, (_, index) => index + 1).map((pageNumber) => {
                const preview = getQuranPage(pageNumber);
                const surah = QURAN_SURAHS.find((item) => item.id === preview[0]?.surah);
                return <Pressable key={pageNumber} onPress={() => { goToPage(pageNumber); setPagePickerVisible(false); }} style={{ width: "23%", minHeight: 112, backgroundColor: page === pageNumber ? colors.gold + "22" : colors.background, borderWidth: page === pageNumber ? 2 : 1, borderColor: page === pageNumber ? colors.gold : colors.border, borderRadius: 8, padding: 6, alignItems: "center", gap: 4 }}>
                  <Text style={{ color: colors.gold, fontSize: 10, fontWeight: "900" }}>{arabicNumber(pageNumber)}</Text><Text numberOfLines={1} style={{ color: colors.text, fontSize: 9, fontWeight: "800" }}>{surah?.name ?? "المصحف"}</Text>
                  <View style={{ width: "100%", gap: 3, paddingTop: 3 }}>{preview.slice(0, 5).map((verse, i) => <View key={verse.surah + "-" + verse.ayah + "-" + i} style={{ height: 3, width: ((78 + (i % 3) * 7) + "%") as `${number}%`, backgroundColor: colors.muted + "99", alignSelf: "center", borderRadius: 2 }} />)}</View>
                </Pressable>;
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={surahPickerVisible} transparent animationType="slide" onRequestClose={() => setSurahPickerVisible(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)", padding: 12 }}>
          <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 22, maxHeight: "84%", overflow: "hidden" }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}>اختر سورة</Text>
              <Pressable onPress={() => setSurahPickerVisible(false)}><Text style={{ color: colors.gold, fontWeight: "700" }}>إغلاق</Text></Pressable>
            </View>
            <View style={{ paddingHorizontal: 14, paddingTop: 12 }}>
              <View style={{ minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 10, gap: 7 }}>
                <MaterialCommunityIcons name="magnify" size={18} color={colors.gold} />
                <TextInput value={surahSearch} onChangeText={setSurahSearch} placeholder="ابحث باسم السورة..." placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.text, textAlign: "right", minHeight: 40, fontSize: 13 }} />
                {surahSearch ? <Pressable onPress={() => setSurahSearch("")}><MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
              </View>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredSurahs.map((surah) => (
                <Pressable
                  key={surah.id}
                  onPress={() => { openSurah(surah.id); setSurahSearch(""); }}
                  style={{ paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}
                >
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>{arabicNumber(surah.id)}. {surah.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{arabicNumber(surah.verseCount)} آية · صفحة {arabicNumber(surah.startPage)}</Text>
                </Pressable>
              ))}
              {!filteredSurahs.length ? <Text style={{ color: colors.muted, textAlign: "center", padding: 20 }}>لا توجد سورة بهذا الاسم.</Text> : null}
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
            </ScrollView>
          </View>
        </View>
      </Modal>

    </AppScreen>
  );
}
