import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppScreen, ScreenHeading, SulyButton, SulyCard, useSulyTheme } from "@/components/suly-ui";
import { localDateKey, useAppStore, type PrayerId } from "@/lib/app-store";
import { calculatePrayerTimes, formatPrayerTime, PRAYER_LABELS } from "@/lib/prayer/calculations";
import { dateFromKey, shiftDateKey } from "@/lib/prayer/dates";

const NAFILAH = [
  { id: "rawatib", label: "السنن الرواتب" },
  { id: "duha", label: "الضحى" },
  { id: "witr", label: "الوتر" },
  { id: "qiyam", label: "قيام الليل" },
];

export default function PrayerScreen() {
  const router = useRouter();
  const { store, updateStore } = useAppStore();
  const { colors } = useSulyTheme();
  const todayKey = localDateKey(new Date(), store.location?.timeZone);
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const log = store.prayerLogs[selectedDay] ?? {};
  const completedCount = Object.values(log).filter((value) => value === "completed").length;
  const times = useMemo(() => store.location ? calculatePrayerTimes(store.location.latitude, store.location.longitude, dateFromKey(selectedDay), store.calculationMethod, store.asrSchool) : null, [store.location, store.calculationMethod, store.asrSchool, selectedDay]);
  const dateLabel = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(dateFromKey(selectedDay));

  const togglePrayer = (id: PrayerId) => {
    const next = { ...log };
    if (next[id] === "completed") delete next[id];
    else next[id] = "completed";
    updateStore((current) => ({ ...current, prayerLogs: { ...current.prayerLogs, [selectedDay]: next } }));
  };
  const toggleNafl = (id: string) => {
    const current = store.naflLogs[selectedDay] ?? [];
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    updateStore((state) => ({ ...state, naflLogs: { ...state.naflLogs, [selectedDay]: next } }));
  };

  return (
    <AppScreen>
      <ScreenHeading title="الصلاة" subtitle="سجلّك اليومي، كما تختار أنت" action={<Pressable onPress={() => router.push("/settings")} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}><MaterialCommunityIcons name="cog-outline" size={22} color={colors.gold} /></Pressable>} />
      <SulyCard style={{ backgroundColor: colors.card }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={() => setSelectedDay((day) => shiftDateKey(day, 1))} accessibilityLabel="اليوم التالي" style={{ padding: 9 }}><MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} /></Pressable>
          <View style={{ alignItems: "center", flex: 1 }}><Text style={{ color: colors.text, fontWeight: "700", fontSize: 17, textAlign: "center" }}>{selectedDay === todayKey ? "اليوم" : dateLabel}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{dateLabel}</Text></View>
          <Pressable onPress={() => setSelectedDay((day) => shiftDateKey(day, -1))} accessibilityLabel="اليوم السابق" style={{ padding: 9 }}><MaterialCommunityIcons name="chevron-right" size={24} color={colors.text} /></Pressable>
        </View>
        <Text style={{ color: colors.gold, fontSize: 16, fontWeight: "700", textAlign: "center" }}>{completedCount} من 5 صلوات مسجلة</Text>
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>غير المسجل لا يعني بالضرورة أنه لم يُؤدَّ. يمكنك تعديل سجل أي يوم.</Text>
      </SulyCard>

      {store.location ? (
        <SulyCard>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={{ color: colors.text, fontWeight: "700" }}>مواقيت {store.location.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{store.calculationMethod === "Egyptian" ? "طريقة الحساب المصرية" : store.calculationMethod}</Text></View>
          {(Object.keys(PRAYER_LABELS) as PrayerId[]).map((id) => {
            const completed = log[id] === "completed";
            return <Pressable key={id} onPress={() => togglePrayer(id)} accessibilityRole="checkbox" accessibilityState={{ checked: completed }} style={{ minHeight: 58, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 7 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><MaterialCommunityIcons name={completed ? "check-circle" : "circle-outline"} size={24} color={completed ? colors.gold : colors.muted} /><Text style={{ color: completed ? colors.gold : colors.muted, fontSize: 13 }}>{completed ? "سُجّلت" : "غير مسجلة"}</Text></View>
              <View style={{ flex: 1, alignItems: "flex-end", marginRight: 12 }}><Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>{PRAYER_LABELS[id]}</Text>{times ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{formatPrayerTime(times[id], store.location?.timeZone)}</Text> : null}</View>
              <MaterialCommunityIcons name="clock-outline" size={20} color={colors.gold} />
            </Pressable>;
          })}
        </SulyCard>
      ) : (
        <SulyCard>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 17, textAlign: "right" }}>أضف مدينتك لحساب المواقيت</Text>
          <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 21 }}>يمكنك السماح باستخدام موقعك أو اختيار مدينة يدويًا. يعمل الحساب على الجهاز ولا يحتاج إلى اتصال.</Text>
          <SulyButton title="إعداد الموقع وطريقة الحساب" onPress={() => router.push("/settings")} />
        </SulyCard>
      )}

      <Text style={{ color: colors.text, fontSize: 19, fontWeight: "700", textAlign: "right", marginTop: 2 }}>النوافل (اختياري)</Text>
      <SulyCard>
        {NAFILAH.map((item) => {
          const selected = (store.naflLogs[selectedDay] ?? []).includes(item.id);
          return <Pressable key={item.id} onPress={() => toggleNafl(item.id)} style={{ minHeight: 48, borderTopWidth: item.id === "rawatib" ? 0 : 1, borderTopColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={{ color: selected ? colors.gold : colors.text, fontWeight: selected ? "700" : "500" }}>{selected ? "تم التسجيل" : "اضغط للتسجيل"}</Text><View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}><Text style={{ color: colors.text }}>{item.label}</Text><MaterialCommunityIcons name={selected ? "checkbox-marked-circle" : "circle-outline"} size={21} color={selected ? colors.gold : colors.muted} /></View></Pressable>;
        })}
      </SulyCard>
    </AppScreen>
  );
}
