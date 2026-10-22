import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { AppScreen, ScreenHeading, SulyCard, TinyTag, useSulyTheme, ProgressBar, SulyInput, SulyButton } from "@/components/suly-ui";
import { localDateKey, useAppStore } from "@/lib/app-store";
import { shiftDateKey } from "@/lib/prayer/dates";
import { calculateAchievementSummary } from "@/lib/achievement-metrics";
import { getQuranProgressHistory } from "@/lib/quran/progress";

const periods = [
  { id: "day", label: "اليوم", days: 1 },
  { id: "week", label: "آخر 7 أيام", days: 7 },
  { id: "month", label: "آخر 30 يومًا", days: 30 },
] as const;

export default function AchievementsScreen() {
  const { store, updateStore } = useAppStore();
  const { colors } = useSulyTheme();
  const today = localDateKey(new Date(), store.location?.timeZone);
  const [period, setPeriod] = useState<(typeof periods)[number]["id"]>("day");
  const [dhikrGoalDraft, setDhikrGoalDraft] = useState(store.dhikrGoal ? `${store.dhikrGoal}` : "");
  const [tasbeehGoalDraft, setTasbeehGoalDraft] = useState(store.tasbeehGoal ? `${store.tasbeehGoal}` : "");
  const range = periods.find((item) => item.id === period) ?? periods[0];
  const days = Array.from({ length: range.days }, (_, index) => shiftDateKey(today, -index));
  const quranHistory = useMemo(() => getQuranProgressHistory(
    store.quranPlan.mode,
    store.quranHistory,
    store.quranHistoryModes,
    store.quranReader.pagesReadByDate,
  ), [store.quranPlan.mode, store.quranHistory, store.quranHistoryModes, store.quranReader.pagesReadByDate]);

  const summary = useMemo(() => calculateAchievementSummary({
    days,
    prayerLogs: store.prayerLogs,
    quranHistory,
    tasbeehCounts: store.tasbeehCounts,
    dhikrCounts: store.dhikrCounts,
    quranTarget: store.quranPlan.target,
    dhikrGoal: store.dhikrGoal,
    tasbeehGoal: store.tasbeehGoal,
  }), [days, store.prayerLogs, quranHistory, store.tasbeehCounts, store.dhikrCounts, store.quranPlan.target, store.dhikrGoal, store.tasbeehGoal]);

  const saveGoals = () => {
    const dhikrGoal = Number.parseInt(dhikrGoalDraft, 10);
    const tasbeehGoal = Number.parseInt(tasbeehGoalDraft, 10);
    updateStore((current) => ({ ...current, dhikrGoal: Number.isFinite(dhikrGoal) && dhikrGoal > 0 ? dhikrGoal : null, tasbeehGoal: Number.isFinite(tasbeehGoal) && tasbeehGoal > 0 ? tasbeehGoal : null }));
  };

  return (
    <AppScreen>
      <ScreenHeading title="إنجازاتي" subtitle="نظرة على ما اخترت تسجيله" />
      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>{periods.map((item) => <TinyTag key={item.id} title={item.label} selected={period === item.id} onPress={() => setPeriod(item.id)} />)}</View>
      <SulyCard style={{ backgroundColor: colors.card }}>
        <Text style={{ color: colors.muted, textAlign: "right" }}>{range.label}</Text>
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 }}>
          <View style={{ flex: 1, minWidth: 130, padding: 12, borderRadius: 16, backgroundColor: colors.surface }}><Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>صلوات أُكملت حسب السجل</Text><Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", textAlign: "right" }}>{summary.prayerComplete}</Text></View>
          <View style={{ flex: 1, minWidth: 130, padding: 12, borderRadius: 16, backgroundColor: colors.surface }}><Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>وحدات الورد</Text><Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", textAlign: "right" }}>{summary.quranComplete}</Text></View>
          <View style={{ flex: 1, minWidth: 130, padding: 12, borderRadius: 16, backgroundColor: colors.surface }}><Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>التسبيح المسجل</Text><Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", textAlign: "right" }}>{summary.tasbeeh}</Text></View>
          <View style={{ flex: 1, minWidth: 130, padding: 12, borderRadius: 16, backgroundColor: colors.surface }}><Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>الأذكار المسجلة</Text><Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", textAlign: "right" }}>{summary.dhikr}</Text></View>
        </View>
      </SulyCard>

      <SulyCard>
        <Text style={{ color: colors.text, textAlign: "right", fontWeight: "700", fontSize: 18 }}>نسب الأهداف</Text>
        <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 21 }}>نحسب الصلاة من الخانات التي سجلت حالتها فقط، والورد من أيام القراءة المسجلة. ويُحسب الذكر والتسبيح على الأيام التي يوجد لها سجل عند تحديد هدف اختياري. اليوم أو الخانة غير المسجلة لا تُعامل على أنها إخفاق.</Text>
        <View style={{ gap: 7 }}><Text style={{ color: colors.text, textAlign: "right" }}>الصلاة المسجلة {summary.prayerRate === null ? "— لا توجد سجلات" : `${summary.prayerRate}%`}</Text>{summary.prayerRate !== null ? <ProgressBar value={summary.prayerRate} max={100} /> : null}</View>
        <View style={{ gap: 7 }}><Text style={{ color: colors.text, textAlign: "right" }}>الورد القرآني {summary.quranRate === null ? "— لا يوجد تقدم مسجل" : `${summary.quranRate}%`}</Text>{summary.quranRate !== null ? <ProgressBar value={summary.quranRate} max={100} color={colors.gold} /> : null}</View>
        <View style={{ gap: 7 }}><Text style={{ color: colors.text, textAlign: "right" }}>الأذكار {summary.dhikrRate === null ? "— حدّد هدفًا اختياريًا" : `${summary.dhikrRate}%`}</Text>{summary.dhikrRate !== null ? <ProgressBar value={summary.dhikrRate} max={100} color={colors.gold} /> : null}</View>
        <View style={{ gap: 7 }}><Text style={{ color: colors.text, textAlign: "right" }}>التسبيح {summary.tasbeehRate === null ? "— حدّد هدفًا اختياريًا" : `${summary.tasbeehRate}%`}</Text>{summary.tasbeehRate !== null ? <ProgressBar value={summary.tasbeehRate} max={100} color={colors.gold} /> : null}</View>
      </SulyCard>

      <SulyCard>
        <Text style={{ color: colors.text, fontWeight: "700", textAlign: "right", fontSize: 17 }}>أهدافك الاختيارية</Text>
        <SulyInput label="هدف الأذكار اليومي (اتركه فارغًا لإلغائه)" value={dhikrGoalDraft} onChangeText={setDhikrGoalDraft} keyboardType="number-pad" placeholder="مثال: 30" />
        <SulyInput label="هدف التسبيح اليومي (اتركه فارغًا لإلغائه)" value={tasbeehGoalDraft} onChangeText={setTasbeehGoalDraft} keyboardType="number-pad" placeholder="مثال: 33" />
        <SulyButton title="حفظ الأهداف" onPress={saveGoals} />
      </SulyCard>

      <SulyCard style={{ backgroundColor: colors.card }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={{ color: colors.gold, fontSize: 22, fontWeight: "800" }}>{store.scoreEnabled && summary.score !== null ? `${summary.score} / 10` : "—"}</Text><Text style={{ color: colors.text, fontWeight: "700", textAlign: "right" }}>مؤشر شخصي اختياري</Text></View>
        <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 21 }}>هذا متوسط تقريبي لنسب الأهداف المسجلة فقط، وليس تقييمًا دينيًا ولا حكمًا على قبول العبادة.</Text>
        <SulyButton title={store.scoreEnabled ? "إيقاف المؤشر" : "تشغيل المؤشر"} secondary onPress={() => updateStore({ scoreEnabled: !store.scoreEnabled })} />
      </SulyCard>
    </AppScreen>
  );
}
