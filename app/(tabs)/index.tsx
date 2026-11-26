import { useEffect, useMemo, useState } from "react";
import { AppState, Pressable, ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppScreen, ScreenHeading, SectionTitle, SulyButton, SulyCard, useSulyTheme, ProgressBar } from "@/components/suly-ui";
import { localDateKey, useAppStore, type PrayerId } from "@/lib/app-store";
import { calculatePrayerTimes, formatPrayerTime, getNextPrayer, PRAYER_LABELS } from "@/lib/prayer/calculations";
import { dateFromKey, shiftDateKey } from "@/lib/prayer/dates";
import { calculateQuranDayProgress } from "@/lib/quran/progress";

function formatRemaining(target: Date, now: Date) {
  const totalSeconds = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `متبقي ${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}

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
  const yesterdayKey = shiftDateKey(today, -1);
  const readYesterday = (store.quranReader.pagesReadByDate[yesterdayKey]?.length ?? 0) > 0 || (store.quranHistory[yesterdayKey] ?? 0) > 0;
  const companionMessage = quranDone > 0
    ? "ما شاء الله، لك اليوم نصيب من القرآن. خذ يومك بهدوء، وربنا يثبتك ويجعل القرآن نورًا لقلبك."
    : readYesterday
      ? "كان لك أمس نصيب من القرآن. لو ما بدأتش وردك النهارده، افتح المصحف ولو بصفحة؛ رفيقك بيفكّرك بمحبة، من غير استعجال."
      : completedPrayers > 0
        ? "خطوة خير جميلة إنك بدأت تسجل صلاتك. كمّل يومك على مهل، وربنا يعينك ويثبت قلبك."
        : "مش مطلوب تغيّر كل حاجة مرة واحدة. ابدأ بخطوة صغيرة تقرّبك من ربنا، وربنا كريم.";
  const prayerTimes = store.location
    ? calculatePrayerTimes(store.location.latitude, store.location.longitude, dateFromKey(today), store.calculationMethod, store.asrSchool)
    : null;
  const [now, setNow] = useState(new Date());
  const [showPrayerTimes, setShowPrayerTimes] = useState(false);
  const [showWeeklyLog, setShowWeeklyLog] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(() => setNow(new Date()), 1000);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    if (AppState.currentState === "active") start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setNow(new Date());
        start();
      } else {
        stop();
      }
    });
    return () => {
      stop();
      subscription.remove();
    };
  }, []);
  const nextPrayerToday = prayerTimes ? getNextPrayer(prayerTimes, now) : null;
  const tomorrowTimes = store.location ? calculatePrayerTimes(store.location.latitude, store.location.longitude, dateFromKey(shiftDateKey(today, 1)), store.calculationMethod, store.asrSchool) : null;
  const nextPrayer = nextPrayerToday ?? (tomorrowTimes ? { id: "fajr" as const, name: PRAYER_LABELS.fajr, time: tomorrowTimes.fajr } : null);
  const upcomingPrayers = useMemo(() => {
    if (!prayerTimes) return [];
    const ids = Object.keys(PRAYER_LABELS) as PrayerId[];
    const nextIndex = nextPrayerToday ? ids.indexOf(nextPrayerToday.id) : ids.length;
    return ids.slice(Math.max(0, nextIndex + 1)).map((id) => ({ id, name: PRAYER_LABELS[id], time: prayerTimes[id] }));
  }, [prayerTimes, nextPrayerToday?.id]);
  const weekStart = shiftDateKey(today, -((dateFromKey(today).getDay() + 1) % 7));
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => shiftDateKey(weekStart, index)), [weekStart]);
  const dayNames = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
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
              <Text style={{ color: colors.text, fontSize: 25, fontWeight: "900", marginTop: 3 }}>{nextPrayer.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", marginTop: 2 }}>{formatPrayerTime(nextPrayer.time, store.location?.timeZone)}</Text>
              <Text accessibilityLiveRegion="polite" style={{ color: colors.gold, fontSize: 21, fontWeight: "900", marginTop: 7, fontVariant: ["tabular-nums"] }}>{formatRemaining(nextPrayer.time, now)}</Text>
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

      {nextPrayer ? <Pressable onPress={() => setShowPrayerTimes((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: showPrayerTimes }} style={{ alignItems: "center", paddingVertical: 7 }}>
        <MaterialCommunityIcons name={showPrayerTimes ? "chevron-up" : "chevron-down"} size={29} color={colors.gold} />
        <Text style={{ color: colors.muted, fontSize: 11 }}>{showPrayerTimes ? "إخفاء باقي المواقيت" : "عرض باقي صلوات اليوم والغد"}</Text>
      </Pressable> : null}
      {showPrayerTimes && prayerTimes ? <SulyCard style={{ gap: 0 }}>
        <Text style={{ color: colors.gold, textAlign: "right", fontWeight: "800", marginBottom: 8 }}>باقي صلوات اليوم</Text>
        {upcomingPrayers.map((item) => <View key={item.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.text }}>{formatPrayerTime(item.time, store.location?.timeZone)}</Text><Text style={{ color: colors.text, fontWeight: "700" }}>{item.name}</Text>
        </View>)}
        <Text style={{ color: colors.gold, textAlign: "right", fontWeight: "800", marginTop: 10 }}>مواقيت الغد</Text>
        {tomorrowTimes ? (Object.keys(PRAYER_LABELS) as PrayerId[]).map((id) => <View key={id} style={{ paddingVertical: 8, flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.text }}>{formatPrayerTime(tomorrowTimes[id], store.location?.timeZone)}</Text><Text style={{ color: colors.muted }}>{PRAYER_LABELS[id]}</Text>
        </View>) : null}
      </SulyCard> : null}

      <Pressable onPress={() => router.push("/audio")} accessibilityRole="button" style={{ backgroundColor: colors.card, borderColor: colors.gold + "77", borderWidth: 1, borderRadius: 19, padding: 16, flexDirection: "row-reverse", alignItems: "center", gap: 13 }}>
        <View style={{ width: 54, height: 54, borderRadius: 17, backgroundColor: colors.gold + "22", alignItems: "center", justifyContent: "center" }}><MaterialCommunityIcons name="radio" size={29} color={colors.gold} /></View>
        <View style={{ flex: 1, alignItems: "flex-end", gap: 4 }}>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 17 }}>إذاعة القرآن الكريم</Text>
          <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>استمع للقراء والتلاوات والإذاعات المفضلة</Text>
        </View>
        <MaterialCommunityIcons name="chevron-left" size={23} color={colors.gold} />
      </Pressable>

      <SulyCard style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <Text style={{ color: colors.gold, fontSize: 15, fontWeight: "800" }}>رسالة من رفيقك</Text>
          <MaterialCommunityIcons name="heart-multiple-outline" size={21} color={colors.gold} />
        </View>
        <Text style={{ color: colors.text, textAlign: "right", lineHeight: 25, fontSize: 14 }}>{companionMessage}</Text>
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

      <SulyCard style={{ padding: 0, overflow: "hidden" }}>
        <Pressable onPress={() => setShowWeeklyLog((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: showWeeklyLog }} style={{ minHeight: 58, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <MaterialCommunityIcons name={showWeeklyLog ? "chevron-up" : "chevron-down"} size={23} color={colors.gold} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}><Text style={{ color: colors.text, fontWeight: "800" }}>جدول تسجيل الصلوات الأسبوعي</Text><MaterialCommunityIcons name="calendar-week" size={22} color={colors.gold} /></View>
        </Pressable>
        {showWeeklyLog ? <View style={{ padding: 10, paddingTop: 0 }}>
          <Text style={{ color: colors.muted, textAlign: "right", fontSize: 11, marginBottom: 8 }}>اضغط على الدائرة لتسجيل الفرض أو إلغاء تسجيله. يبدأ الأسبوع من السبت.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={{ flexDirection: "row-reverse", alignItems: "center" }}>
                <View style={{ width: 58 }} />
                {dayNames.map((day) => <Text key={day} style={{ width: 42, textAlign: "center", color: colors.gold, fontSize: 10, fontWeight: "700" }}>{day}</Text>)}
              </View>
              {(Object.keys(PRAYER_LABELS) as PrayerId[]).map((id) => <View key={id} style={{ flexDirection: "row-reverse", alignItems: "center", minHeight: 43, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={{ width: 58, color: colors.text, fontSize: 12, fontWeight: "700", textAlign: "right" }}>{PRAYER_LABELS[id]}</Text>
                {weekDays.map((dayKey) => {
                  const done = store.prayerLogs[dayKey]?.[id] === "completed";
                  return <Pressable key={dayKey} onPress={() => {
                    const dayLog = store.prayerLogs[dayKey] ?? {};
                    const nextLog = { ...dayLog };
                    if (done) delete nextLog[id]; else nextLog[id] = "completed";
                    updateStore((current) => ({ ...current, prayerLogs: { ...current.prayerLogs, [dayKey]: nextLog } }));
                  }} accessibilityRole="checkbox" accessibilityState={{ checked: done }} style={{ width: 42, alignItems: "center", justifyContent: "center", paddingVertical: 6 }}>
                    <View style={{ width: 25, height: 25, borderRadius: 9, backgroundColor: done ? colors.gold : colors.card, borderWidth: 1, borderColor: done ? colors.gold : colors.border, alignItems: "center", justifyContent: "center" }}>
                      {done ? <MaterialCommunityIcons name="check" size={17} color="#17392F" /> : null}
                    </View>
                  </Pressable>;
                })}
              </View>)}
            </View>
          </ScrollView>
        </View> : null}
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

      <SectionTitle>اختصارات إضافية</SectionTitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 9 }}>
        {[
          { label: "القصص", icon: "book-open-variant" as const, route: "/stories" },
          { label: "إنجازاتي", icon: "chart-box-outline" as const, route: "/achievements" },
          { label: "القبلة", icon: "compass-outline" as const, route: "/qibla" },
        ].map((item) => <Pressable key={item.route} onPress={() => router.push(item.route as any)} style={{ width: "31%", minHeight: 100, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", gap: 9 }}>
          <MaterialCommunityIcons name={item.icon} size={29} color={colors.gold} />
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}>{item.label}</Text>
        </Pressable>)}
      </View>
      <SulyCard style={{ backgroundColor: colors.card }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700", textAlign: "right" }}>خطوة صغيرة اليوم تكفي</Text>
        <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 22 }}>اختر هدفًا واحدًا يناسب وقتك، وتذكّر أن التطبيق يسجل ما تختار إدخاله فقط.</Text>
      </SulyCard>
    </AppScreen>
  );
}
