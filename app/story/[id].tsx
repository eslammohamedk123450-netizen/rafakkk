import { useEffect, useMemo, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppScreen, ScreenHeading, SulyButton, SulyCard, ProgressBar, useSulyTheme } from "@/components/suly-ui";
import { getIslamicStory } from "@/lib/content/stories";
import { useAppStore } from "@/lib/app-store";
import { getQuranPage, getQuranPageForVerse, QURAN_SURAHS } from "@/lib/quran";

export default function StoryReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { store, updateStore } = useAppStore();
  const { colors } = useSulyTheme();
  const story = useMemo(() => getIslamicStory(String(id ?? "")), [id]);
  const contextChapter = story?.chapters.find((item) => item.title.includes("الخلفية"));
  const lessonsChapter = story?.chapters.find((item) => item.title.includes("الدروس المستفادة"));
  const readingChapters = story ? story.chapters.filter((item) => item !== contextChapter && item !== lessonsChapter) : [];
  const [chapterIndex, setChapterIndex] = useState(0);
  const [showContext, setShowContext] = useState(true);
  const [showLessons, setShowLessons] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedReference, setSelectedReference] = useState<{ label: string; surahId: number; startAyah: number; endAyah: number } | null>(null);
  const [showVerseExplanation, setShowVerseExplanation] = useState(false);

  useEffect(() => {
    if (!story) return;
    const saved = store.storyProgress[story.id] ?? 0;
    const offset = contextChapter ? 1 : 0;
    setChapterIndex(Math.min(Math.max(0, saved - offset), Math.max(0, readingChapters.length - 1)));
  }, [story?.id]);

  if (!story) {
    return <AppScreen><ScreenHeading title="القصة غير موجودة" subtitle="ارجع إلى مكتبة القصص واختر قصة أخرى." /><SulyButton title="العودة للقصص" onPress={() => router.replace("/stories")} /></AppScreen>;
  }

  const activeIndex = Math.max(0, Math.min(chapterIndex, readingChapters.length - 1));
  const chapter = readingChapters[activeIndex];
  const lessonsText = chapter?.lessons || lessonsChapter?.body;
  const percent = Math.round(((activeIndex + 1) / Math.max(1, readingChapters.length)) * 100);
  const savePlace = (nextIndex = chapterIndex) => {
    const safeIndex = Math.max(0, Math.min(readingChapters.length - 1, nextIndex));
    setChapterIndex(safeIndex);
    updateStore((current) => ({ ...current, storyProgress: { ...current.storyProgress, [story.id]: safeIndex + (contextChapter ? 1 : 0) } }));
    setNotice("اتحفظ مكانك في القصة على هذا الجهاز.");
  };
  const referenceItems = (chapter?.reference ?? "").split(/[؛;]/).map((raw) => {
    const match = raw.trim().match(/سورة\s+(.+?)،?\s*الآيات?\s*(\\d+)(?:\s*[–-]\s*(\\d+))?/);
    if (!match) return null;
    const surahName = match[1].replace(/[،.]/g, "").trim();
    const surah = QURAN_SURAHS.find((item) => item.name === surahName || item.name.replace(/^ال/, "") === surahName.replace(/^ال/, ""));
    if (!surah) return null;
    return { label: raw.trim(), surahId: surah.id, startAyah: Number(match[2]), endAyah: Number(match[3] ?? match[2]) };
  }).filter((item): item is { label: string; surahId: number; startAyah: number; endAyah: number } => Boolean(item));
  const selectedPage = selectedReference ? getQuranPage(getQuranPageForVerse(selectedReference.surahId, selectedReference.startAyah) ?? 0) : [];
  const selectedVerse = selectedPage.find((verse) => verse.surah === selectedReference?.surahId && verse.ayah === selectedReference?.startAyah);
  const openSelectedReferenceInQuran = () => {
    if (!selectedReference) return;
    router.push(`/quran-reader?surah=${selectedReference.surahId}&ayah=${selectedReference.startAyah}` as any);
    setSelectedReference(null);
  };
  const openLink = async (url: string) => {
    try { await Linking.openURL(url); } catch { setNotice("تعذر فتح الرابط. تحقق من اتصال الإنترنت."); }
  };

  return (
    <AppScreen>
      <ScreenHeading title={story.title} subtitle={story.subtitle} action={<Pressable onPress={() => router.back()}><Text style={{ color: colors.gold, fontWeight: "700" }}>رجوع</Text></Pressable>} />
      <SulyCard style={{ padding: 0, overflow: "hidden", gap: 0 }}>
        <View style={{ width: "100%", height: 150, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 8 }}>
          <MaterialCommunityIcons name="book-open-page-variant" size={50} color={colors.gold} />
          <Text style={{ color: colors.muted, fontSize: 12 }}>اقرأ على مهل، وارجع وقتما تحب</Text>
        </View>
        <View style={{ padding: 14, gap: 8 }}>
          <Text style={{ color: colors.gold, fontWeight: "700", textAlign: "right" }}>{story.categoryLabel} · {story.readingMinutes} دقيقة تقريبًا</Text>
          <Text style={{ color: colors.text, textAlign: "right", fontSize: 14, lineHeight: 23 }}>{story.summary}</Text>
        </View>
      </SulyCard>

      {contextChapter && showContext ? <SulyCard style={{ gap: 10 }}>
        <Text style={{ color: colors.gold, fontSize: 19, fontWeight: "900", textAlign: "right" }}>المقدمة التاريخية: قبل بداية القصة</Text>
        <Text style={{ color: colors.text, fontSize: 16, lineHeight: 31, textAlign: "right" }}>{contextChapter.body}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>{contextChapter.reference}</Text>
        <SulyButton title="تخطي المقدمة وابدأ القصة" onPress={() => { setShowContext(false); setShowLessons(false); }} />
      </SulyCard> : null}

      {!showContext ? <SulyCard style={{ gap: 8 }}>
        <Text style={{ color: colors.gold, fontWeight: "800", textAlign: "right" }}>بدأت القصة الأساسية</Text>
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>يمكنك الرجوع إلى المقدمة التاريخية في أي وقت.</Text>
        {contextChapter ? <SulyButton title="عرض المقدمة التاريخية" secondary onPress={() => setShowContext(true)} /> : null}
      </SulyCard> : null}

      <SulyCard style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>الفصل {activeIndex + 1} من {readingChapters.length}</Text>
          <Text style={{ color: colors.text, fontWeight: "800" }}>رحلتك في القصة</Text>
        </View>
        <ProgressBar value={activeIndex + 1} max={Math.max(1, readingChapters.length)} color={colors.gold} />
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", textAlign: "right" }}>{chapter?.title}</Text>
        <Text style={{ color: colors.text, fontSize: 17, lineHeight: 34, textAlign: "right" }}>{chapter?.body}</Text>
        <SulyButton title={showLessons ? "إخفاء الدروس المستفادة من هذا الفصل" : "الدروس المستفادة من هذا الفصل"} secondary disabled={!lessonsText} onPress={() => setShowLessons((value) => !value)} />
        {showLessons && lessonsText ? <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 13, gap: 8 }}>
          <Text style={{ color: colors.gold, fontWeight: "900", fontSize: 17, textAlign: "right" }}>نتعلم من هذا الجزء</Text>
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 29, textAlign: "right" }}>{lessonsText}</Text>
        </View> : null}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 8 }}>
          <Text style={{ color: colors.gold, fontWeight: "800", textAlign: "right" }}>الآيات المرتبطة بهذا الفصل</Text>
          {referenceItems.length ? referenceItems.map((reference) => <Pressable key={reference.label} onPress={() => { setSelectedReference(reference); setShowVerseExplanation(false); }} style={{ padding: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.gold, textAlign: "right", fontWeight: "800" }}>{reference.label} · اضغط للاختيارات</Text>
          </Pressable>) : <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 22 }}>{chapter?.reference}</Text>}
          <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>اضغط على المرجع لتختار شرح الآيات أو فتح موضعها في مصحف رفيقك.</Text>
        </View>
        <SulyButton title="احفظ مكاني" secondary onPress={() => savePlace()} />
        <View style={{ flexDirection: "row", gap: 9 }}>
          <View style={{ flex: 1 }}><SulyButton title="الفصل السابق" secondary disabled={activeIndex === 0} onPress={() => { setShowLessons(false); savePlace(activeIndex - 1); }} /></View>
          <View style={{ flex: 1 }}><SulyButton title={activeIndex === readingChapters.length - 1 ? "أنهيت القصة" : "الفصل التالي"} disabled={activeIndex === readingChapters.length - 1} onPress={() => { setShowLessons(false); savePlace(activeIndex + 1); }} /></View>
        </View>
        {activeIndex === readingChapters.length - 1 ? <Text style={{ color: colors.gold, textAlign: "center", fontWeight: "700" }}>وصلت إلى نهاية القصة. بارك الله في وقتك وقراءتك.</Text> : null}
        {notice ? <Text style={{ color: colors.muted, textAlign: "center", fontSize: 12 }}>{notice}</Text> : null}
      </SulyCard>

      <SulyCard>
        <Text style={{ color: colors.text, textAlign: "right", fontWeight: "800", fontSize: 17 }}>المصادر والمشاهدة</Text>
        {story.sources.map((source) => <Pressable key={source.url} onPress={() => openLink(source.url)} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.gold, textAlign: "right", fontWeight: "700" }}>{source.label} ↗</Text>
        </Pressable>)}
        <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12, lineHeight: 21 }}>روابط المصادر الخارجية اختيارية للمراجعة فقط؛ أما آيات القصة فتُفتح داخل مصحف رفيقك.</Text>
        <SulyButton title="ابحث عن فيديو القصة على يوتيوب" secondary onPress={() => openLink(story.videoUrl)} />
      </SulyCard>
      <Modal visible={Boolean(selectedReference)} transparent animationType="slide" onRequestClose={() => setSelectedReference(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.68)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 13, maxHeight: "82%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Pressable onPress={() => setSelectedReference(null)}><Text style={{ color: colors.muted, fontSize: 16 }}>إغلاق ✕</Text></Pressable>
              <Text style={{ color: colors.gold, fontWeight: "900", fontSize: 18 }}>ماذا تريد أن تفعل؟</Text>
            </View>
            <Text style={{ color: colors.text, textAlign: "right", fontWeight: "700" }}>{selectedReference?.label}</Text>
            <SulyButton title="شرح مبسط للآيات وعلاقتها بالقصة" secondary onPress={() => setShowVerseExplanation((value) => !value)} />
            {showVerseExplanation ? <ScrollView style={{ maxHeight: 210 }}>
              <Text style={{ color: colors.text, textAlign: "right", lineHeight: 29, fontSize: 15 }}>{chapter?.body}</Text>
              {selectedVerse ? <Text style={{ color: colors.gold, textAlign: "right", lineHeight: 29, marginTop: 10 }}>{selectedVerse.text}</Text> : null}
              <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 23, fontSize: 12, marginTop: 8 }}>هذا شرح لسياق الآيات داخل القصة، وليس نقلًا عن كتاب تفسير معتمد.</Text>
            </ScrollView> : null}
            <SulyButton title="الذهاب إلى الآية في المصحف الداخلي" onPress={openSelectedReferenceInQuran} />
            <Text style={{ color: colors.muted, textAlign: "center", fontSize: 11 }}>لن يتم فتح أي تطبيق أو موقع خارجي.</Text>
          </View>
        </View>
      </Modal>
      <Text style={{ color: colors.muted, textAlign: "center", fontSize: 11, lineHeight: 18 }}>هذه صياغة مبسطة وليست بديلًا عن النص القرآني أو الحديث الأصلي. عند اختلاف الروايات، يُرجع إلى المصادر المذكورة.</Text>
    </AppScreen>
  );
}
