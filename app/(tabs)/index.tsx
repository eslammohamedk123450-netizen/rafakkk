import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppScreen, ScreenHeading, SectionTitle, SulyButton, SulyCard, useSulyTheme, ProgressBar } from "@/components/suly-ui";
import { localDateKey, useAppStore, type PrayerId } from "@/lib/app-store";
import { calculatePrayerTimes, formatPrayerTime, getNextPrayer, PRAYER_LABELS } from "@/lib/prayer/calculations";
import { dateFromKey, shiftDateKey } from "@/lib/prayer/dates";
import { calculateQuranDayProgress } from "@/lib/quran/progress";

export default function HomeScreen() {
  const router = useRouter();
  const { store, updateStore } = useAppStore();
  const { colors } = useSulyTheme();
  const today = localDateKey(new Date(), store.location?.timeZone);
  const todayLog = store.prayerLogs[today] ?? {};
  const completedPrayers = Object.values(todayLog).filter((status) => status === "completed").length;
  const quranDone = calculateQuranDayProgress({
    mode: store.quranPlan.mode,
    savedProgress: store.quranHistory[today],
    savedMode: store.quranHistoryModes[today],
    pagesReadToday: store.quranReader.pagesReadByDate[today]?.length ?? 0,
  });
  const tasbeehCount = store.tasbeehCounts[today] ?? 0;
  const dhikrCount = Object.values(store.dhikrCounts[today] ?? {}).reduce((sum, count) => sum + count, 0);
  const totalDhikr = tasbeehCount + dhikrCount;
  const prayerTimes = store.location
    ? calculatePrayerTimes(store.location.latitude, store.location.longitude, dateFromKey(today), store.calculationMethod, store.asrSchool)
    : null;
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const nextPrayerToday = prayerTimes ? getNextPrayer(prayerTimes, now) : null;
  const tomorrowTimes = store.location ? calculatePrayerTimes(store.location.latitude, store.location.longitude, dateFromKey(shiftDateKey(today, 1)), store.calculationMethod, store.asrSchool) : null;
  const nextPrayer = nextPrayerToday ?? (tomorrowTimes ? { id: "fajr" as const, name: PRAYER_LABELS.fajr, time: tomorrowTimes.fajr } : null);
  const pageTitle = new Intl.DateTimeFormat("ar", {
    weekday: "long", day: "numeric", month: "long", timeZone: store.location?.timeZone,
  }).format(now);

  const togglePrayer = (id: PrayerId) => {
    const next = { ...todayLog };
    if (next[id] === "completed") delete next[id];
    else next[id] = "completed";
    updateStore((current) => ({ ...current, prayerLogs: { ...current.prayerLogs, [today]: next } }));
  };

  return (
    <AppScreen>
      <ScreenHeading
        title="يوم جديد، فرصة جديدة"
        subtitle={pageTitle}
        action={<Pressable onPress={() => router.push("/settings")} accessibilityLabel="الإعدادات" style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}><MaterialCommunityIcons name="cog-outline" size={23} color={colors.gold} /></Pressable>}
      />

      <SulyCard style={{ backgroundColor: colors.card, borderColor: colors.card, paddingVertical: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ alignItems: "flex-end", flex: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>السلام عليكم</Text>
            <Text style={{ color: colors.text, fontSize: 21, fontWeight: "700", marginTop: 4, textAlign: "right" }}>رفيقك نحو الالتزام</Text>
          </View>
          <MaterialCommunityIcons name="weather-night" size={30} color={colors.gold} />
        </View>
        {nextPrayer ? (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 13, marginTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{nextPrayerToday ? "الصلاة التالية" : "أول صلاة غدًا"}</Text>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 2 }}>{nextPrayer.name} · {formatPrayerTime(nextPrayer.time, store.location?.timeZone)}</Text>
            </View>
            <MaterialCommunityIcons name="clock-time-four-outline" size={25} color={colors.gold} />
          </View>
        ) : store.location ? (
          <Text style={{ color: colors.muted, textAlign: "right", marginTop: 8 }}>اكتملت أوقات اليوم المعروضة. يمكنك متابعة أوقات الغد من صفحة الصلاة.</Text>
        ) : (
          <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 13, marginTop: 6 }}>
            <Text style={{ color: colors.muted, textAlign: "right" }}>حدّد مدينتك لعرض المواقيت المحسوبة على جهازك.</Text>
            <SulyButton title="إعداد مواقيت الصلاة" secondary onPress={() => router.push("/settings")} />
          </View>
        )}
      </SulyCard>

      <SectionTitle trailing={<Text style={{ color: colors.muted, fontSize: 13 }}>{completedPrayers} من 5 مسجلة</Text>}>صلوات اليوم</SectionTitle>
      <SulyCard style={{ padding: 12 }}>
        <View style={{ flexDirection: "row-reverse", gap: 6 }}>
          {(Object.keys(PRAYER_LABELS) as PrayerId[]).map((id) => {
            const done = todayLog[id] === "completed";
            return (
              <Pressable key={id} onPress={() => togglePrayer(id)} accessibilityRole="button" accessibilityLabel={`${PRAYER_LABELS[id]} ${done ? "مسجلة" : "غير مسجلة"}`} style={{ flex: 1, minHeight: 66, borderRadius: 14, backgroundColor: done ? colors.gold : colors.card, alignItems: "center", justifyContent: "center", gap: 4 }}>
                <MaterialCommunityIcons name={done ? "check-circle" : "circle-outline"} size={18} color={done ? "#17392F" : colors.muted} />
                <Text style={{ color: done ? "#17392F" : colors.text, fontSize: 11, fontWeight: "600" }}>{PRAYER_LABELS[id]}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>غير المسجلة هنا لا تعني بالضرورة أنك لم تصلِّ؛ عدّل السجل متى احتجت.</Text>
      </SulyCard>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <SulyCard style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><MaterialCommunityIcons name="book-open-page-variant-outline" size={22} color={colors.gold} /><Text style={{ color: colors.text, fontWeight: "700" }}>الورد اليومي</Text></View>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", textAlign: "right" }}>{quranDone} / {store.quranPlan.target} {store.quranPlan.mode === "pages" ? "صفحة" : store.quranPlan.mode === "juz" ? "جزء" : store.quranPlan.mode === "minutes" ? "دقيقة" : "مقطع"}</Text>
          <ProgressBar value={quranDone} max={store.quranPlan.target} />
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>متبقي {Math.max(0, store.quranPlan.target - quranDone)}</Text>
          <SulyButton title="متابعة الورد" secondary onPress={() => router.push("/quran")} />
        </SulyCard>
        <SulyCard style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><MaterialCommunityIcons name="heart-outline" size={22} color={colors.gold} /><Text style={{ color: colors.text, fontWeight: "700" }}>الأذكار</Text></View>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", textAlign: "right" }}>{totalDhikr} مرة</Text>
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>ما سجلته اليوم</Text>
          <View style={{ flex: 1 }} />
          <SulyButton title="افتح الأذكار" secondary onPress={() => router.push("/adhkar")} />
        </SulyCard>
      </View>

      <SulyCard style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => updateStore((current) => ({ ...current, tasbeehCounts: { ...current.tasbeehCounts, [today]: (current.tasbeehCounts[today] ?? 0) + 1 } }))} accessibilityRole="button" accessibilityLabel="زيادة عداد التسبيح" style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" }}>
          <MaterialCommunityIcons name="plus" size={26} color="#17392F" />
        </Pressable>
        <View style={{ alignItems: "flex-end", flex: 1, marginRight: 12 }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>عداد التسبيح السريع</Text>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 24 }}>{tasbeehCount} مرة</Text>
        </View>
        <MaterialCommunityIcons name="hand-heart-outline" size={25} color={colors.gold} />
      </SulyCard>

      <SulyCard style={{ backgroundColor: colors.card }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700", textAlign: "right" }}>خطوة صغيرة اليوم تكفي</Text>
        <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 22 }}>اختر هدفًا واحدًا يناسب وقتك، وتذكّر أن التطبيق يسجل ما تختار إدخاله فقط.</Text>
      </SulyCard>
    </AppScreen>
  );
}
