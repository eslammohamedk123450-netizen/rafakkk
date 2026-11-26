import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppScreen, ScreenHeading, SulyButton, SulyCard, ProgressBar, useSulyTheme } from "@/components/suly-ui";
import { getIslamicStory } from "@/lib/content/stories";
import { useAppStore } from "@/lib/app-store";

export default function StoryReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { store, updateStore } = useAppStore();
  const { colors } = useSulyTheme();
  const story = useMemo(() => getIslamicStory(String(id ?? "")), [id]);
  const savedChapter = story ? store.storyProgress[story.id] ?? 0 : 0;
  const [chapterIndex, setChapterIndex] = useState(savedChapter);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (story) setChapterIndex(Math.min(store.storyProgress[story.id] ?? 0, story.chapters.length - 1));
  }, [story?.id, store.storyProgress]);
  if (!story) {
    return <AppScreen><ScreenHeading title="القصة غير موجودة" subtitle="ارجع إلى مكتبة القصص واختر قصة أخرى." /><SulyButton title="العودة للقصص" onPress={() => router.replace("/stories")} /></AppScreen>;
  }

  const activeIndex = Math.max(0, Math.min(chapterIndex, story.chapters.length - 1));
  const chapter = story.chapters[activeIndex];
  const percent = Math.round(((activeIndex + 1) / story.chapters.length) * 100);
  const savePlace = (nextIndex = chapterIndex) => {
    const safeIndex = Math.max(0, Math.min(story.chapters.length - 1, nextIndex));
    setChapterIndex(safeIndex);
    updateStore((current) => ({ ...current, storyProgress: { ...current.storyProgress, [story.id]: safeIndex } }));
    setNotice("اتحفظ مكانك في القصة على هذا الجهاز.");
  };
  const openLink = async (url: string) => {
    try { await Linking.openURL(url); } catch { setNotice("تعذر فتح الرابط. تحقق من اتصال الإنترنت."); }
  };

  return (
    <AppScreen>
      <ScreenHeading title={story.title} subtitle={story.subtitle} action={<Pressable onPress={() => router.back()}><Text style={{ color: colors.gold, fontWeight: "700" }}>رجوع</Text></Pressable>} />
      <SulyCard style={{ padding: 0, overflow: "hidden", gap: 0 }}>
        <View style={{ width: "100%", height: 175, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 8 }}>
          <MaterialCommunityIcons name="book-open-page-variant" size={54} color={colors.gold} />
          <Text style={{ color: colors.muted, fontSize: 12 }}>اقرأ على مهل، وارجع وقتما تحب</Text>
        </View>
        <View style={{ padding: 14, gap: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 11, textAlign: "right" }}>{story.imageCredit}</Text>
          <Text style={{ color: colors.gold, fontWeight: "700", textAlign: "right" }}>{story.categoryLabel} · {story.readingMinutes} دقائق تقريبًا</Text>
          <Text style={{ color: colors.text, textAlign: "right", fontSize: 14, lineHeight: 23 }}>{story.summary}</Text>
        </View>
      </SulyCard>
      <SulyCard style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>الفصل {activeIndex + 1} من {story.chapters.length}</Text>
          <Text style={{ color: colors.text, fontWeight: "800" }}>رحلتك في القصة</Text>
        </View>
        <ProgressBar value={chapterIndex + 1} max={story.chapters.length} color={colors.gold} />
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", textAlign: "right" }}>{chapter.title}</Text>
        <Text style={{ color: colors.text, fontSize: 17, lineHeight: 34, textAlign: "right" }}>{chapter.body}</Text>
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 6 }}>
          <Text style={{ color: colors.gold, fontWeight: "800", textAlign: "right" }}>مرجع هذا الفصل</Text>
          <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 22 }}>{chapter.reference}</Text>
        </View>
        <SulyButton title="احفظ مكاني" secondary onPress={() => savePlace()} />
        <View style={{ flexDirection: "row", gap: 9 }}>
          <View style={{ flex: 1 }}><SulyButton title="الفصل السابق" secondary disabled={activeIndex === 0} onPress={() => savePlace(activeIndex - 1)} /></View>
          <View style={{ flex: 1 }}><SulyButton title={activeIndex === story.chapters.length - 1 ? "أنهيت القصة" : "الفصل التالي"} disabled={activeIndex === story.chapters.length - 1} onPress={() => savePlace(activeIndex + 1)} /></View>
        </View>
        {activeIndex === story.chapters.length - 1 ? <Text style={{ color: colors.gold, textAlign: "center", fontWeight: "700" }}>وصلت إلى نهاية القصة. بارك الله في وقتك وقراءتك.</Text> : null}
        {notice ? <Text style={{ color: colors.muted, textAlign: "center", fontSize: 12 }}>{notice}</Text> : null}
      </SulyCard>
      <SulyCard>
        <Text style={{ color: colors.text, textAlign: "right", fontWeight: "800", fontSize: 17 }}>المصادر والمشاهدة</Text>
        {story.sources.map((source) => (
          <Pressable key={source.url} onPress={() => openLink(source.url)} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.gold, textAlign: "right", fontWeight: "700" }}>{source.label} ↗</Text>
          </Pressable>
        ))}
        <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12, lineHeight: 21 }}>للمشاهدة المرئية: يفتح الرابط نتائج بحث عن فيديو القصة على يوتيوب. راجع مصدر الحلقة ومحتواها؛ فالرابط ليس توثيقًا علميًا لمتن القصة.</Text>
        <SulyButton title="ابحث عن فيديو القصة على يوتيوب" secondary onPress={() => openLink(story.videoUrl)} />
      </SulyCard>
      <Text style={{ color: colors.muted, textAlign: "center", fontSize: 11, lineHeight: 18 }}>هذه صياغة مبسطة وليست بديلًا عن النص القرآني أو الحديث الأصلي. عند اختلاف الروايات، يُرجع إلى المصادر المذكورة.</Text>
    </AppScreen>
  );
}
