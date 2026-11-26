import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { AppScreen, ScreenHeading, SulyCard, TinyTag, ProgressBar, useSulyTheme } from "@/components/suly-ui";
import { ISLAMIC_STORIES, STORY_CATEGORIES } from "@/lib/content/stories";
import { useAppStore } from "@/lib/app-store";

export default function StoriesScreen() {
  const router = useRouter();
  const { store } = useAppStore();
  const { colors } = useSulyTheme();
  const [category, setCategory] = useState<string>("all");
  const stories = useMemo(
    () => category === "all" ? ISLAMIC_STORIES : ISLAMIC_STORIES.filter((story) => story.category === category),
    [category],
  );

  return (
    <AppScreen>
      <ScreenHeading title="حكايات وعِبر" subtitle="اقرأ على مهل، وتوقف وقتما تحب، وارجع من حيث وصلت." />
      <SulyCard style={{ padding: 0, overflow: "hidden", borderColor: colors.border }}>
        <View style={{ padding: 18, gap: 8 }}>
          <Text style={{ color: colors.gold, fontSize: 12, fontWeight: "800", textAlign: "right" }}>مكتبة الحكايات الإسلامية</Text>
          <Text style={{ color: colors.text, fontSize: 21, fontWeight: "800", textAlign: "right" }}>كل فصل رحلة قصيرة… وكل قصة لها أثر</Text>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 22, textAlign: "right" }}>قصص مقسمة لفصول، مع حفظ تلقائي لمكان القراءة ومراجع للرجوع إلى النصوص الأصلية.</Text>
        </View>
        <View style={{ height: 6, backgroundColor: colors.gold, opacity: 0.75 }} />
      </SulyCard>
      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
        {STORY_CATEGORIES.map((item) => <TinyTag key={item.id} title={item.label} selected={category === item.id} onPress={() => setCategory(item.id)} />)}
      </View>
      <View style={{ gap: 12 }}>
        {stories.map((story) => {
          const hasProgress = Object.prototype.hasOwnProperty.call(store.storyProgress, story.id);
          const saved = store.storyProgress[story.id] ?? 0;
          const percent = hasProgress ? Math.round(((saved + 1) / story.chapters.length) * 100) : 0;
          return (
            <Pressable key={story.id} onPress={() => router.push({ pathname: "/story/[id]", params: { id: story.id } } as Href)} accessibilityRole="button">
              <SulyCard style={{ padding: 0, overflow: "hidden", gap: 0 }}>
                <View style={{ width: "100%", height: 150, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <MaterialCommunityIcons name="book-open-page-variant" size={48} color={colors.gold} />
                  <Text style={{ color: colors.muted, fontSize: 12 }}>من مكتبة رفيقك · محتوى محفوظ على الجهاز</Text>
                </View>
                <View style={{ padding: 15, gap: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: colors.gold, fontSize: 12, fontWeight: "700" }}>{story.categoryLabel}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{story.readingMinutes} دقائق · {story.chapters.length} فصول</Text>
                  </View>
                  <Text style={{ color: colors.text, textAlign: "right", fontSize: 19, fontWeight: "800" }}>{story.title}</Text>
                  <Text style={{ color: colors.gold, textAlign: "right", fontSize: 13, fontWeight: "600" }}>{story.subtitle}</Text>
                  <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 22 }}>{story.summary}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{hasProgress ? `آخر مكان محفوظ: الفصل ${saved + 1}` : "ابدأ القصة"}</Text>
                    <Text style={{ color: colors.gold, fontWeight: "800" }}>اقرأ القصة ←</Text>
                  </View>
                  <ProgressBar value={hasProgress ? saved + 1 : 0} max={story.chapters.length} color={colors.gold} />
                  <Text style={{ color: colors.muted, fontSize: 11, textAlign: "right" }}>{percent}% من الفصول</Text>
                </View>
              </SulyCard>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 19 }}>الصور للتعبير عن الأماكن والطبيعة والعمارة فقط، ولا تصوّر الأنبياء أو الصحابة. اقرأ المراجع للتحقق من النصوص والتفاصيل.</Text>
    </AppScreen>
  );
}
