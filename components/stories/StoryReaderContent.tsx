import { useEffect, useMemo, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppScreen, ScreenHeading, SulyButton, SulyCard, ProgressBar, useSulyTheme } from "@/components/suly-ui";
import { getIslamicStory, ISLAMIC_STORIES } from "@/lib/content/stories";
import { useAppStore } from "@/lib/app-store";
import { getQuranPage, getQuranPageForVerse, QURAN_SURAHS } from "@/lib/quran";
import { getTafsirAyah, tafsirDisplayText, TAFSIR_SOURCE } from "@/lib/quran/tafsir";

function parseStoryReferences(value: string) {
  let previousSurahId: number | null = null;
  return value.split(/[؛;]/).map((raw) => {
    const text = raw.trim().replace(/^و(?=سورة)/, "");
    if (!text) return null;
    let surahName = "";
    let startAyah = 0;
    let endAyah = 0;
    let match = text.match(/سورة\s+(.+?)،?\s*الآي(?:ة|ات)\s*(\d+)(?:\s*[–-]\s*(\d+))?/);
    if (match) {
      surahName = match[1].trim();
      startAyah = Number(match[2]);
      endAyah = Number(match[3] ?? match[2]);
    } else {
      match = text.match(/سورة\s+(.+?)\s+(\d+):(\d+)(?:\s*[–-]\s*(?:(\d+):)?(\d+))?/);
      if (match) {
        surahName = match[1].trim();
        startAyah = Number(match[3]);
        endAyah = Number(match[5] ?? match[3]);
      } else {
        match = text.match(/سورة\s+(.+?)،\s*(\d+)(?:\s*[–-]\s*(\d+))?/);
        if (match) {
          surahName = match[1].trim();
          startAyah = Number(match[2]);
          endAyah = Number(match[3] ?? match[2]);
        } else {
          const bare = text.match(/^(\d+):(\d+)(?:\s*[–-]\s*(?:(\d+):)?(\d+))?$/);
          const verseOnly = text.match(/^الآي(?:ة|ات)\s*(\d+)(?:\s*[–-]\s*(\d+))?$/);
          const inheritedRange = text.match(/^(\d+)(?:\s*[–-]\s*(\d+))?$/);
          if (bare) {
            const surah = QURAN_SURAHS.find((item) => item.id === Number(bare[1]));
            if (!surah) return null;
            previousSurahId = surah.id;
            startAyah = Number(bare[2]);
            endAyah = Number(bare[4] ?? bare[2]);
            return { label: text, surahId: surah.id, startAyah, endAyah };
          }
          if ((verseOnly || inheritedRange) && previousSurahId) {
            const range = verseOnly ?? inheritedRange!;
            startAyah = Number(range[1]);
            endAyah = Number(range[2] ?? range[1]);
            return { label: text, surahId: previousSurahId, startAyah, endAyah };
          }
          return null;
        }
      }
    }
    const normalize = (name: string) => name.replace(/^ال/, "").replace(/[أإآ]/g, "ا").replace(/[ًٌٍَُِّْـ]/g, "").replace(/[،.]/g, "").trim();
    const surah = QURAN_SURAHS.find((item) => normalize(item.name) === normalize(surahName));
    if (!surah || !startAyah || !endAyah) return null;
    previousSurahId = surah.id;
    return { label: text, surahId: surah.id, startAyah, endAyah };
  }).filter((item): item is { label: string; surahId: number; startAyah: number; endAyah: number } => Boolean(item));
}

// GitHub Pages serves a static Expo export, so pre-generate one HTML route per story.
export function generateStaticParams() {
  return ISLAMIC_STORIES.map((story) => ({ id: story.id }));
}

export function StoryReaderContent({ storyId, onBack, onOpenQuran }: { storyId: string; onBack: () => void; onOpenQuran: (surahId: number, ayah: number) => void }) {
  const id = storyId;
  const { store, updateStore } = useAppStore();
  const { colors } = useSulyTheme();
  const story = useMemo(() => getIslamicStory(String(id ?? "")), [id]);
  const contextChapter = null;
  const lessonsChapter = story?.chapters.find((item) => item.title.includes("الدروس المستفادة"));
  const readingChapters = story ? story.chapters.filter((item) => item !== lessonsChapter) : [];
  const [chapterIndex, setChapterIndex] = useState(0);
  const [showContext, setShowContext] = useState(false);
  const [showLessons, setShowLessons] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedReference, setSelectedReference] = useState<{ label: string; surahId: number; startAyah: number; endAyah: number } | null>(null);
  const [selectedAyah, setSelectedAyah] = useState(1);
  const [tafsirText, setTafsirText] = useState("");
  const [tafsirFootnotes, setTafsirFootnotes] = useState("");
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirError, setTafsirError] = useState("");

  useEffect(() => {
    if (!story) return;
    const saved = store.storyProgress[story.id] ?? 0;
    const offset = contextChapter ? 1 : 0;
    setChapterIndex(Math.min(Math.max(0, saved - offset), Math.max(0, readingChapters.length - 1)));
    setShowContext(false);
    setShowLessons(false);
    setSelectedReference(null);
    setSelectedAyah(1);
    setNotice("");
  }, [story?.id]);

  useEffect(() => {
    if (!selectedReference) return;
    let active = true;
    setTafsirLoading(true);
    setTafsirError("");
    setTafsirText("");
    setTafsirFootnotes("");
    getTafsirAyah(selectedReference.surahId, selectedAyah)
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
  }, [selectedReference?.surahId, selectedAyah]);
  if (!story) {
    return <AppScreen><ScreenHeading title="القصة غير موجودة" subtitle="ارجع إلى مكتبة القصص واختر قصة أخرى." /><SulyButton title="العودة للقصص" onPress={onBack} /></AppScreen>;
  }

  const activeIndex = Math.max(0, Math.min(chapterIndex, readingChapters.length - 1));
  const chapter = readingChapters[activeIndex];
  const lessonsText = chapter?.lessons || lessonsChapter?.body;
  const savePlace = (nextIndex = chapterIndex) => {
    const safeIndex = Math.max(0, Math.min(readingChapters.length - 1, nextIndex));
    setChapterIndex(safeIndex);
    updateStore((current) => ({ ...current, storyProgress: { ...current.storyProgress, [story.id]: safeIndex + (contextChapter ? 1 : 0) } }));
    setNotice("اتحفظ مكانك في القصة على هذا الجهاز.");
  };
  const referenceItems = parseStoryReferences(chapter?.reference ?? "");
  const contextReferenceItems = parseStoryReferences(contextChapter?.reference ?? "");
  const selectedPage = selectedReference ? getQuranPage(getQuranPageForVerse(selectedReference.surahId, selectedAyah) ?? 0) : [];
  const selectedVerse = selectedPage.find((verse) => verse.surah === selectedReference?.surahId && verse.ayah === selectedAyah);

  const openSelectedReferenceInQuran = () => {
    if (!selectedReference) return;
    onOpenQuran(selectedReference.surahId, selectedAyah);
    setSelectedReference(null);
  };
  const openLink = async (url: string) => {
    try { await Linking.openURL(url); } catch { setNotice("تعذر فتح الرابط. تحقق من اتصال الإنترنت."); }
  };

  return (
    <AppScreen>
      <ScreenHeading title={story.title} subtitle={story.subtitle} action={<Pressable onPress={onBack}><Text style={{ color: colors.gold, fontWeight: "700" }}>رجوع</Text></Pressable>} />
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
        {contextReferenceItems.length ? <View style={{ gap: 7 }}>
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>مراجع المقدمة — اضغط على المرجع لعرض التفسير أو فتح المصحف:</Text>
          {contextReferenceItems.map((reference) => <Pressable key={`context-${reference.label}`} onPress={() => { setSelectedReference(reference); setSelectedAyah(reference.startAyah); }} style={{ padding: 9, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.gold, fontSize: 13, textAlign: "right", fontWeight: "700" }}>{reference.label}</Text>
          </Pressable>)}
        </View> : <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>{contextChapter.reference}</Text>}
        <SulyButton title="تخطي المقدمة وابدأ القصة" onPress={() => { setShowContext(false); setShowLessons(false); }} />
      </SulyCard> : null}

      {!showContext ? <SulyCard style={{ gap: 8 }}>
        <Text style={{ color: colors.gold, fontWeight: "800", textAlign: "right" }}>بدأت القصة الأساسية</Text>
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>يمكنك الرجوع إلى المقدمة التاريخية في أي وقت.</Text>
        {contextChapter ? <SulyButton title="عرض المقدمة التاريخية" secondary onPress={() => setShowContext(true)} /> : null}
      </SulyCard> : null}

      {!showContext ? <SulyCard style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>الصفحة {activeIndex + 1} من {readingChapters.length}</Text>
          <Text style={{ color: colors.text, fontWeight: "800" }}>رحلتك في القصة</Text>
        </View>
        <ProgressBar value={activeIndex + 1} max={Math.max(1, readingChapters.length)} color={colors.gold} />
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", textAlign: "right" }}>{chapter?.title}</Text>
        <Text style={{ color: colors.text, fontSize: 17, lineHeight: 34, textAlign: "right" }}>{chapter?.body}</Text>
        <SulyButton title={showLessons ? "إخفاء الدروس المستفادة من هذه الصفحة" : "الدروس المستفادة من هذا الفصل"} secondary disabled={!lessonsText} onPress={() => setShowLessons((value) => !value)} />
        {showLessons && lessonsText ? <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 13, gap: 8 }}>
          <Text style={{ color: colors.gold, fontWeight: "900", fontSize: 17, textAlign: "right" }}>نتعلم من هذا الجزء</Text>
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 29, textAlign: "right" }}>{lessonsText}</Text>
          {referenceItems.length ? <View style={{ gap: 7, marginTop: 5 }}>
            <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>آيات وردت في هذا الدرس — اضغط على المرجع لعرض تفسير كل آية:</Text>
            {referenceItems.map((reference) => <Pressable key={`lesson-${reference.label}`} onPress={() => { setSelectedReference(reference); setSelectedAyah(reference.startAyah); }} style={{ padding: 9, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.gold, textAlign: "right", fontWeight: "700" }}>{reference.label}</Text>
            </Pressable>)}
          </View> : null}
        </View> : null}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 8 }}>
          <Text style={{ color: colors.gold, fontWeight: "800", textAlign: "right" }}>الآيات المرتبطة بهذه الصفحة</Text>
          {referenceItems.length ? referenceItems.map((reference) => <Pressable key={reference.label} onPress={() => { setSelectedReference(reference); setSelectedAyah(reference.startAyah); }} style={{ padding: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.gold, textAlign: "right", fontWeight: "800" }}>{reference.label} · اضغط للاختيارات</Text>
          </Pressable>) : <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 22 }}>{chapter?.reference}</Text>}
          <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>اضغط على المرجع لتختار شرح الآيات أو فتح موضعها في مصحف رفيقك.</Text>
        </View>
        <SulyButton title="احفظ مكاني" secondary onPress={() => savePlace()} />
        <View style={{ flexDirection: "row", gap: 9 }}>
          <View style={{ flex: 1 }}><SulyButton title="الصفحة السابقة" secondary disabled={activeIndex === 0} onPress={() => { setShowLessons(false); savePlace(activeIndex - 1); }} /></View>
          <View style={{ flex: 1 }}><SulyButton title={activeIndex === readingChapters.length - 1 ? "أنهيت القصة" : "الصفحة التالية"} disabled={activeIndex === readingChapters.length - 1} onPress={() => { setShowLessons(false); savePlace(activeIndex + 1); }} /></View>
        </View>
        {activeIndex === readingChapters.length - 1 ? <Text style={{ color: colors.gold, textAlign: "center", fontWeight: "700" }}>وصلت إلى نهاية القصة. بارك الله في وقتك وقراءتك.</Text> : null}
        {notice ? <Text style={{ color: colors.muted, textAlign: "center", fontSize: 12 }}>{notice}</Text> : null}
      </SulyCard>
 : null}

      {!showContext ? <SulyCard>
        <Text style={{ color: colors.text, textAlign: "right", fontWeight: "800", fontSize: 17 }}>المصادر والمشاهدة</Text>
        {story.sources.map((source) => <Pressable key={source.url} onPress={() => openLink(source.url)} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.gold, textAlign: "right", fontWeight: "700" }}>{source.label} ↗</Text>
        </Pressable>)}
        <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12, lineHeight: 21 }}>روابط المصادر الخارجية اختيارية للمراجعة فقط؛ أما آيات القصة فتُفتح داخل مصحف رفيقك.</Text>
        <SulyButton title="ابحث عن فيديو القصة على يوتيوب" secondary onPress={() => openLink(story.videoUrl)} />
      </SulyCard> : null}
      {selectedReference ? <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedReference(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.68)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 13, maxHeight: "82%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Pressable onPress={() => setSelectedReference(null)}><Text style={{ color: colors.muted, fontSize: 16 }}>إغلاق ✕</Text></Pressable>
              <Text style={{ color: colors.gold, fontWeight: "900", fontSize: 18 }}>ماذا تريد أن تفعل؟</Text>
            </View>
            <Text style={{ color: colors.text, textAlign: "right", fontWeight: "700" }}>اختر الآية التي تريد تفسيرها من هذا المرجع:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row-reverse", gap: 7 }}>
              {Array.from({ length: Math.max(1, selectedReference!.endAyah - selectedReference!.startAyah + 1) }, (_, index) => selectedReference!.startAyah + index).map((ayah) => <Pressable key={ayah} onPress={() => setSelectedAyah(ayah)} style={{ minWidth: 42, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, backgroundColor: selectedAyah === ayah ? colors.gold : colors.card, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: selectedAyah === ayah ? "#111111" : colors.text, textAlign: "center", fontWeight: "800" }}>{ayah}</Text>
              </Pressable>)}
            </ScrollView>
            <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 10 }}>
              {selectedVerse ? <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.card }}>
                <Text style={{ color: colors.gold, textAlign: "right", fontWeight: "800", marginBottom: 7 }}>نص الآية · {selectedAyah}</Text>
                <Text style={{ color: colors.text, textAlign: "right", lineHeight: 32, fontSize: 18 }}>{selectedVerse.text}</Text>
              </View> : null}
              <Text style={{ color: colors.gold, textAlign: "right", fontWeight: "900", fontSize: 16 }}>التفسير الميسّر</Text>
              {tafsirLoading ? <Text style={{ color: colors.muted, textAlign: "right" }}>جاري تحميل التفسير الموثّق…</Text> : null}
              {tafsirError ? <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 24 }}>{tafsirError} تأكد من اتصال الإنترنت ثم اختر الآية مرة أخرى.</Text> : null}
              {tafsirText ? <Text style={{ color: colors.text, textAlign: "right", lineHeight: 29, fontSize: 15 }}>{tafsirText}</Text> : null}
              {tafsirFootnotes ? <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 24, fontSize: 12 }}>{tafsirFootnotes}</Text> : null}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 9, gap: 4 }}>
                <Text style={{ color: colors.gold, textAlign: "right", fontWeight: "800", fontSize: 12 }}>المصدر: التفسير الميسّر</Text>
                <Text style={{ color: colors.muted, textAlign: "right", fontSize: 11, lineHeight: 19 }}>{TAFSIR_SOURCE.credit} · النسخة {TAFSIR_SOURCE.version} · الناشر الرقمي: {TAFSIR_SOURCE.publisher}</Text>
              </View>
            </ScrollView>
            <SulyButton title="الذهاب إلى الآية في المصحف الداخلي" onPress={openSelectedReferenceInQuran} />
            <Text style={{ color: colors.muted, textAlign: "center", fontSize: 11 }}>لن يتم فتح أي تطبيق أو موقع خارجي.</Text>
          </View>
        </View>
      </Modal> : null}
      <Text style={{ color: colors.muted, textAlign: "center", fontSize: 11, lineHeight: 18 }}>هذه صياغة مبسطة وليست بديلًا عن النص القرآني أو الحديث الأصلي. عند اختلاف الروايات، يُرجع إلى المصادر المذكورة.</Text>
    </AppScreen>
  );
}
