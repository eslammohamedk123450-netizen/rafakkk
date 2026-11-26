import { useCallback, useMemo, useState } from "react";
import { Linking, Modal, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { AppScreen, ScreenHeading, SulyButton, SulyCard, SulyInput, TinyTag, useSulyTheme, ProgressBar } from "@/components/suly-ui";
import { localDateKey, useAppStore } from "@/lib/app-store";
import { getContentEntries, type StoredContentRecord } from "@/lib/local-db";

const categories = [
  { id: "morning", label: "الصباح" },
  { id: "evening", label: "المساء" },
  { id: "after_prayer", label: "بعد الصلاة" },
  { id: "sleep_wake", label: "النوم والاستيقاظ" },
  { id: "istighfar", label: "الاستغفار" },
  { id: "salawat", label: "الصلاة على النبي ﷺ" },
  { id: "quran", label: "القرآن" },
  { id: "dua", label: "الأدعية" },
  { id: "favorites", label: "المفضلة" },
  { id: "custom", label: "مخصص" },
];

type DisplayEntry = StoredContentRecord & { custom?: boolean };

export default function AdhkarScreen() {
  const { store, updateStore } = useAppStore();
  const { colors } = useSulyTheme();
  const today = localDateKey(new Date(), store.location?.timeZone);
  const [records, setRecords] = useState<StoredContentRecord[]>([]);
  const [category, setCategory] = useState("morning");
  const [showComposer, setShowComposer] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [localNotice, setLocalNotice] = useState("");

  const refresh = useCallback(() => {
    let active = true;
    getContentEntries().then((items) => { if (active) setRecords(items); }).catch((error) => console.warn("Unable to load local dhikr library", error));
    return () => { active = false; };
  }, []);
  useFocusEffect(refresh);

  const entries = useMemo<DisplayEntry[]>(() => {
    const custom = store.customDhikr.map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      body: item.body,
      repetition: `${item.target} مرة كهدف شخصي`,
      sourceName: "نص مخصص من المستخدم",
      sourceReference: "لم تتم مراجعته كمصدر ديني",
      sourceUrl: "",
      authenticity: "مخصص",
      origin: "builtin" as const,
      custom: true,
    }));
    return [...records, ...custom];
  }, [records, store.customDhikr]);
  const visibleEntries = entries.filter((entry) => {
    if (category === "favorites") return store.favorites.includes(entry.id);
    return entry.category === category;
  });
  const todayCounts = store.dhikrCounts[today] ?? {};
  const totalCount = Object.values(todayCounts).reduce((sum, count) => sum + count, 0) + (store.tasbeehCounts[today] ?? 0);

  const addCount = (id: string) => updateStore((current) => {
    const counts = current.dhikrCounts[today] ?? {};
    return { ...current, dhikrCounts: { ...current.dhikrCounts, [today]: { ...counts, [id]: (counts[id] ?? 0) + 1 } } };
  });
  const toggleFavorite = (id: string) => updateStore((current) => ({ ...current, favorites: current.favorites.includes(id) ? current.favorites.filter((value) => value !== id) : [...current.favorites, id] }));
  const addCustom = () => {
    if (!customTitle.trim() || !customBody.trim()) return;
    const item = { id: `custom-${Date.now()}`, title: customTitle.trim(), body: customBody.trim(), target: 1, category: "custom" };
    updateStore((current) => ({ ...current, customDhikr: [...current.customDhikr, item] }));
    setCustomTitle("");
    setCustomBody("");
    setShowComposer(false);
  };
  const openSource = (value: string) => {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Unsupported protocol");
      void Linking.openURL(url.toString()).catch(() => setLocalNotice("تعذر فتح رابط المصدر على هذا الجهاز."));
    } catch {
      setLocalNotice("رابط المصدر غير صالح؛ بقي المحتوى المحلي كما هو.");
    }
  };

  return (
    <AppScreen>
      <ScreenHeading title="الأذكار" subtitle={`${totalCount} مرة مما سجلته اليوم`} action={<Pressable onPress={() => setShowComposer(true)} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }} accessibilityLabel="إضافة ذكر مخصص"><MaterialCommunityIcons name="plus" size={24} color={colors.gold} /></Pressable>} />
      <SulyCard style={{ backgroundColor: colors.card }}>
        <Text style={{ color: colors.text, textAlign: "right", fontWeight: "700" }}>مكتبتك معاك في كل وقت</Text>
        <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 21 }}>الأذكار والمحتوى الأساسي محفوظان داخل التطبيق ويعملان دون إنترنت. سجلاتك ومفضلاتك تظل على جهازك.</Text>
        {localNotice ? <Text style={{ color: colors.gold, textAlign: "right" }}>{localNotice}</Text> : null}
      </SulyCard>
      <SulyCard style={{ backgroundColor: colors.card }}>
        <Text style={{ color: colors.text, fontWeight: "700", textAlign: "right", fontSize: 17 }}>عداد التسبيح</Text>
        <Text style={{ color: colors.gold, fontSize: 34, fontWeight: "800", textAlign: "center" }}>{store.tasbeehCounts[today] ?? 0}</Text>
        {store.tasbeehGoal ? <><ProgressBar value={store.tasbeehCounts[today] ?? 0} max={store.tasbeehGoal} color={colors.gold} /><Text style={{ color: colors.muted, textAlign: "center" }}>هدفك الاختياري: {store.tasbeehGoal}</Text></> : <Text style={{ color: colors.muted, textAlign: "center" }}>لا يوجد هدف يومي محدد</Text>}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <SulyButton title="تسبيحة" onPress={() => updateStore((current) => ({ ...current, tasbeehCounts: { ...current.tasbeehCounts, [today]: (current.tasbeehCounts[today] ?? 0) + 1 } }))} />
          <SulyButton title={store.tasbeehGoal ? `الهدف ${store.tasbeehGoal}` : "هدف اختياري"} secondary onPress={() => updateStore((current) => ({ ...current, tasbeehGoal: current.tasbeehGoal ? null : 33 }))} />
        </View>
      </SulyCard>

      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>{categories.map((item) => <TinyTag key={item.id} title={item.label} selected={category === item.id} onPress={() => setCategory(item.id)} />)}</View>

      {visibleEntries.length === 0 ? (
        <SulyCard><Text style={{ color: colors.text, fontWeight: "700", textAlign: "right" }}>{category === "favorites" ? "لا توجد أذكار مفضلة بعد" : category === "custom" ? "لم تضف أذكارًا مخصصة بعد" : "لا يوجد محتوى في هذا القسم حاليًا"}</Text><Text style={{ color: colors.muted, textAlign: "right", lineHeight: 21 }}>يمكنك إضافة نصوصك الخاصة. مكتبتك الأساسية متاحة دون اتصال بالإنترنت.</Text></SulyCard>
      ) : visibleEntries.map((entry) => {
        const count = todayCounts[entry.id] ?? 0;
        const favorite = store.favorites.includes(entry.id);
        return (
          <SulyCard key={entry.id}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Pressable onPress={() => toggleFavorite(entry.id)} accessibilityLabel={favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"} style={{ padding: 5 }}><MaterialCommunityIcons name={favorite ? "heart" : "heart-outline"} size={22} color={favorite ? colors.gold : colors.muted} /></Pressable>
              <View style={{ flex: 1, alignItems: "flex-end", marginRight: 8 }}><Text style={{ color: colors.text, fontSize: 17, fontWeight: "700", textAlign: "right" }}>{entry.title}</Text>{entry.repetition ? <Text style={{ color: colors.gold, fontSize: 12, marginTop: 3 }}>{entry.repetition}</Text> : null}</View>
            </View>
            <Text selectable style={{ color: colors.text, fontSize: 19, lineHeight: 34, textAlign: "right" }}>{entry.body}</Text>
            <View style={{ padding: 11, borderRadius: 13, backgroundColor: colors.card, gap: 4 }}>
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>{entry.sourceName} · {entry.sourceReference}</Text>
              {entry.authenticity && entry.authenticity !== "مخصص" ? <Text style={{ color: colors.accent, fontSize: 12, textAlign: "right" }}>الحكم المنقول: {entry.authenticity}</Text> : <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>نص مخصص؛ لم تتم مراجعته كمصدر ديني.</Text>}
              {entry.sourceUrl ? <Pressable onPress={() => openSource(entry.sourceUrl)}><Text style={{ color: colors.accent, fontSize: 12, textAlign: "right", textDecorationLine: "underline" }}>فتح المصدر</Text></Pressable> : null}
            </View>
            <SulyButton title={`سجّل الذكر · ${count} اليوم`} secondary onPress={() => addCount(entry.id)} />
          </SulyCard>
        );
      })}

      <Modal visible={showComposer} transparent animationType="fade" onRequestClose={() => setShowComposer(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 20 }}>
          <SulyCard>
            <Text style={{ color: colors.text, fontSize: 19, fontWeight: "700", textAlign: "right" }}>ذكر مخصص</Text>
            <Text style={{ color: colors.muted, textAlign: "right" }}>يُحفظ هذا النص على جهازك ويُعرض بوضوح على أنه مخصص ولم يُراجع كمصدر ديني.</Text>
            <SulyInput label="العنوان" value={customTitle} onChangeText={setCustomTitle} placeholder="عنوان الذكر" />
            <SulyInput label="النص" value={customBody} onChangeText={setCustomBody} placeholder="اكتب النص الذي تريد حفظه" multiline />
            <SulyButton title="حفظ على هذا الجهاز" onPress={addCustom} disabled={!customTitle.trim() || !customBody.trim()} />
            <SulyButton title="إلغاء" secondary onPress={() => setShowComposer(false)} />
          </SulyCard>
        </View>
      </Modal>
    </AppScreen>
  );
}
