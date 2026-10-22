import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AppScreen, ScreenHeading, SulyButton, SulyCard, SulyInput, TinyTag, useSulyTheme, ProgressBar } from "@/components/suly-ui";
import { localDateKey, useAppStore } from "@/lib/app-store";

const modes = [
  { id: "pages", label: "صفحات", unit: "صفحة" },
  { id: "juz", label: "أجزاء", unit: "جزء" },
  { id: "minutes", label: "دقائق", unit: "دقيقة" },
  { id: "surah", label: "مقاطع/سور", unit: "مقطع" },
] as const;

export default function QuranScreen() {
  const router = useRouter();
  const { store, updateStore } = useAppStore();
  const { colors } = useSulyTheme();
  const today = localDateKey(new Date(), store.location?.timeZone);
  const progress = store.quranHistory[today] ?? 0;
  const [mode, setMode] = useState(store.quranPlan.mode);
  const [target, setTarget] = useState(`${store.quranPlan.target}`);
  const [sessions, setSessions] = useState(`${store.quranPlan.sessionsPerDay}`);
  const [times, setTimes] = useState(store.quranPlan.sessionTimes.join("، "));
  const [surahName, setSurahName] = useState(store.quranPlan.surahName ?? "");
  const [passage, setPassage] = useState(store.quranPlan.passage ?? "");
  const [endDate, setEndDate] = useState(store.quranPlan.targetEndDate ?? "");
  const [notice, setNotice] = useState("");
  const selectedMode = modes.find((item) => item.id === mode) ?? modes[0];
  const remaining = Math.max(0, Number(target) - progress);
  const endDateDays = store.quranPlan.targetEndDate ? Math.ceil((Date.parse(`${store.quranPlan.targetEndDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000) : null;

  const savePlan = () => {
    setNotice("");
    const numericTarget = Math.max(1, Number.parseInt(target, 10) || 1);
    const sessionCount = Math.max(1, Math.min(12, Number.parseInt(sessions, 10) || 1));
    const enteredTimes = times.split(/[،,]/).map((value) => value.trim()).filter(Boolean);
    const sessionTimes = enteredTimes.filter((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)).slice(0, 12);
    if (sessionTimes.length !== enteredTimes.length) { setNotice("اكتب مواعيد الجلسات بصيغة 24 ساعة مثل 08:00."); return; }
    if (sessionTimes.length > 0 && sessionTimes.length !== sessionCount) { setNotice("عدد المواعيد يجب أن يساوي عدد الجلسات، أو اترك خانة المواعيد فارغة."); return; }
    const cleanEndDate = endDate.trim();
    if (cleanEndDate && (!/^\d{4}-\d{2}-\d{2}$/.test(cleanEndDate) || Number.isNaN(Date.parse(`${cleanEndDate}T00:00:00Z`)) || new Date(`${cleanEndDate}T00:00:00Z`).toISOString().slice(0, 10) !== cleanEndDate)) { setNotice("أدخل تاريخًا صحيحًا بصيغة YYYY-MM-DD."); return; }
    updateStore((current) => ({ ...current, quranPlan: { ...current.quranPlan, mode, target: numericTarget, sessionsPerDay: sessionCount, sessionTimes, surahName: surahName.trim(), passage: passage.trim(), targetEndDate: cleanEndDate || undefined } }));
    setTarget(`${numericTarget}`);
    setSessions(`${sessionCount}`);
  };
  const addProgress = (delta: number) => {
    const next = Math.max(0, progress + delta);
    updateStore((current) => ({ ...current, quranHistory: { ...current.quranHistory, [today]: next } }));
  };
  const goalCaption = store.quranPlan.mode === "surah" ? `${store.quranPlan.surahName || "المقطع المحدد"}${store.quranPlan.passage ? ` · ${store.quranPlan.passage}` : ""}` : `هدفك اليومي ${store.quranPlan.target} ${selectedMode.unit}`;

  return (
    <AppScreen>
      <ScreenHeading title="الورد القرآني" subtitle="خطة تناسب وقتك، وخطوة في كل مرة" action={<Pressable onPress={() => router.push("/settings")}><Text style={{ color: colors.gold, fontWeight: "700" }}>الإعدادات</Text></Pressable>} />
      <SulyCard style={{ backgroundColor: colors.card, gap: 14 }}>
        <Text style={{ color: colors.muted, textAlign: "right" }}>ورد اليوم</Text>
        <Text style={{ color: colors.text, textAlign: "right", fontSize: 19, fontWeight: "700" }}>{goalCaption}</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ color: colors.muted }}>متبقي {remaining} {selectedMode.unit}</Text><Text style={{ color: colors.text, fontSize: 27, fontWeight: "800" }}>{progress} / {store.quranPlan.target}</Text></View>
        <ProgressBar value={progress} max={store.quranPlan.target} color={colors.gold} />
        {store.quranPlan.targetEndDate ? <Text style={{ color: colors.muted, textAlign: "right" }}>موعد هدف الختم: {store.quranPlan.targetEndDate}{endDateDays !== null ? endDateDays >= 0 ? ` · متبقٍ ${endDateDays} يومًا` : " · تجاوز الموعد المحدد" : ""}</Text> : null}
        <View style={{ flexDirection: "row", gap: 10 }}><SulyButton title={`أتممت ${store.quranPlan.mode === "minutes" ? "10 دقائق" : "وحدة واحدة"}`} onPress={() => addProgress(store.quranPlan.mode === "minutes" ? 10 : 1)} /><View style={{ width: 92 }}><SulyButton title="تراجع" secondary onPress={() => addProgress(store.quranPlan.mode === "minutes" ? -10 : -1)} /></View></View>
        <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>التقدم محفوظ على هذا الجهاز، ويمكن تعديله في أي وقت.</Text>
      </SulyCard>

      <SulyCard>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18, textAlign: "right" }}>خطة الورد</Text>
        <Text style={{ color: colors.muted, textAlign: "right" }}>اختر ما يناسبك من صفحات أو أجزاء أو وقت قراءة أو مقاطع محددة.</Text>
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>{modes.map((item) => <TinyTag key={item.id} title={item.label} selected={mode === item.id} onPress={() => setMode(item.id)} />)}</View>
        <SulyInput label={mode === "surah" ? "عدد المقاطع/السور المستهدف يوميًا" : `الهدف اليومي (${selectedMode.unit})`} value={target} onChangeText={setTarget} keyboardType="number-pad" />
        {mode === "surah" ? <><SulyInput label="اسم السورة أو مجموعة السور" value={surahName} onChangeText={setSurahName} placeholder="مثال: سورة الملك" /><SulyInput label="المقطع أو حدود القراءة" value={passage} onChangeText={setPassage} placeholder="مثال: من الآية ... إلى ..." /></> : null}
        <SulyInput label="عدد جلسات القراءة يوميًا" value={sessions} onChangeText={setSessions} keyboardType="number-pad" />
        <SulyInput label="مواعيد الجلسات (افصل بينها بفاصلة)" value={times} onChangeText={setTimes} placeholder="08:00، 18:00" />
        <SulyInput label="موعد هدف الختم (اختياري، YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} placeholder="2026-12-31" />
        <SulyButton title="حفظ الخطة" onPress={savePlan} />
        {notice ? <Text style={{ color: colors.gold, textAlign: "right" }}>{notice}</Text> : null}
      </SulyCard>

      <SulyCard style={{ backgroundColor: colors.card }}>
        <Text style={{ color: colors.text, textAlign: "right", fontWeight: "700" }}>جلساتك لهذا اليوم</Text>
        <Text style={{ color: colors.muted, textAlign: "right" }}>عدد الجلسات: {store.quranPlan.sessionsPerDay}</Text>
        {store.quranPlan.sessionTimes.length ? <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>{store.quranPlan.sessionTimes.map((time, index) => <View key={`${time}-${index}`} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.surface }}><Text style={{ color: colors.text }}>{time}</Text></View>)}</View> : <Text style={{ color: colors.muted, textAlign: "right" }}>لم تُحدد مواعيد للجلسات.</Text>}
      </SulyCard>
    </AppScreen>
  );
}
