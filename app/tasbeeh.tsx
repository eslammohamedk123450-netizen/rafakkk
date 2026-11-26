import { useMemo, useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { AppScreen, ScreenHeading, SulyButton, SulyCard, ProgressBar, useSulyTheme } from "@/components/suly-ui";
import { localDateKey, useAppStore } from "@/lib/app-store";

const dhikrOptions = [
  {
    id: "subhanallah",
    title: "سُبْحَانَ اللهِ وَبِحَمْدِهِ",
    note: "ذكر عظيم، ومن قاله مائة مرة في يوم حُطّت خطاياه وإن كانت مثل زبد البحر.",
    source: "صحيح البخاري 6405، وصحيح مسلم 2691",
    url: "https://sunnah.com/bukhari:6405",
  },
  {
    id: "tasbih-prayer",
    title: "سُبْحَانَ اللهِ · الْحَمْدُ لِلَّهِ · اللهُ أَكْبَرُ",
    note: "من الأذكار الواردة دبر الصلاة: التسبيح والتحميد والتكبير.",
    source: "صحيح مسلم 597",
    url: "https://sunnah.com/muslim:597",
  },
  {
    id: "hawqala",
    title: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ",
    note: "وصفها النبي ﷺ بأنها كنز من كنوز الجنة.",
    source: "صحيح البخاري 6384، وصحيح مسلم 2704",
    url: "https://sunnah.com/bukhari:6384",
  },
  {
    id: "istighfar",
    title: "أَسْتَغْفِرُ اللهَ",
    note: "الاستغفار من هدي النبي ﷺ؛ كان يستغفر الله ويتوب إليه في اليوم مرات كثيرة.",
    source: "صحيح البخاري 6307",
    url: "https://sunnah.com/bukhari:6307",
  },
];

export default function TasbeehScreen() {
  const { store, updateStore } = useAppStore();
  const { colors } = useSulyTheme();
  const today = localDateKey(new Date(), store.location?.timeZone);
  const count = store.tasbeehCounts[today] ?? 0;
  const goal = store.tasbeehGoal ?? 100;
  const remaining = Math.max(0, goal - count);
  const [selectedId, setSelectedId] = useState(dhikrOptions[0].id);
  const [goalDraft, setGoalDraft] = useState(String(goal));
  const [timeDraft, setTimeDraft] = useState(store.tasbeehReminderTime || "20:00");
  const [notice, setNotice] = useState("");
  const selected = useMemo(() => dhikrOptions.find((item) => item.id === selectedId) ?? dhikrOptions[0], [selectedId]);
  const completed = store.tasbeehGoal !== null && count >= goal;

  const increment = () => {
    const nextCount = count + 1;
    updateStore((current) => ({ ...current, tasbeehCounts: { ...current.tasbeehCounts, [today]: nextCount } }));
    if (store.tasbeehGoal && nextCount >= store.tasbeehGoal && store.tasbeehReminderNotificationId) {
      void Notifications.cancelScheduledNotificationAsync(store.tasbeehReminderNotificationId).catch(() => undefined);
      updateStore((current) => ({ ...current, tasbeehReminderEnabled: false, tasbeehReminderNotificationId: null }));
    }
  };

  const saveGoal = () => {
    const parsed = Number(goalDraft);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100000) {
      setNotice("اكتب هدفًا صحيحًا من 1 إلى 100000.");
      return;
    }
    updateStore({ tasbeehGoal: parsed });
    setNotice(`تم حفظ هدفك اليومي: ${parsed} تسبيحة.`);
  };

  const toggleReminder = async () => {
    if (store.tasbeehReminderEnabled && store.tasbeehReminderNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(store.tasbeehReminderNotificationId).catch(() => undefined);
      updateStore({ tasbeehReminderEnabled: false, tasbeehReminderNotificationId: null });
      setNotice("تم إيقاف التذكير اليومي.");
      return;
    }
    if (!store.tasbeehGoal) {
      setNotice("حدد هدفك اليومي أولًا، ثم فعّل التذكير لمساعدتك على إكماله.");
      return;
    }
    const match = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(timeDraft.trim());
    if (!match) {
      setNotice("اكتب وقت التذكير بصيغة 20:00.");
      return;
    }
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      setNotice("لم يتم منح إذن الإشعارات. يمكنك تفعيلها من إعدادات الهاتف.");
      return;
    }
    try {
      const [hour, minute] = timeDraft.split(":").map(Number);
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "رفيقك يذكّرك بالذكر",
          body: "لو لسه ما كملتش هدف التسبيح، خذ دقيقة وكمّل على مهلك. القليل الدائم خير.",
          sound: true,
          data: { screen: "tasbeeh" },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
      if (store.tasbeehReminderNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(store.tasbeehReminderNotificationId).catch(() => undefined);
      }
      updateStore({ tasbeehReminderEnabled: true, tasbeehReminderTime: timeDraft, tasbeehReminderNotificationId: id });
      setNotice(`تم ضبط تذكير يومي الساعة ${timeDraft}. يمكنك إيقافه في أي وقت.`);
    } catch {
      setNotice("تعذر ضبط التذكير على هذا الجهاز حاليًا.");
    }
  };

  return (
    <AppScreen>
      <ScreenHeading title="المسبحة الإلكترونية" subtitle="اذكر الله بقلب حاضر، وعلى مهل" />
      <SulyCard style={{ alignItems: "center", gap: 12, backgroundColor: colors.card }}>
        <View style={{ alignSelf: "stretch", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>تسبيحات اليوم</Text>
          <MaterialCommunityIcons name="hand-heart" size={24} color={colors.gold} />
        </View>
        <Text style={{ color: colors.text, fontSize: 25, fontWeight: "900", textAlign: "center", lineHeight: 42 }}>{selected.title}</Text>
        <Pressable onPress={increment} accessibilityRole="button" accessibilityLabel="اضغط لزيادة عداد التسبيح" style={({ pressed }) => ({ width: 226, height: 226, borderRadius: 113, borderWidth: 9, borderColor: colors.gold, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.97 : 1 }], shadowColor: colors.gold, shadowOpacity: 0.18, shadowRadius: 18, elevation: 5 })}>
          <View style={{ width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>اضغط للتسبيح</Text>
            <Text style={{ color: colors.gold, fontSize: 58, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{count}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>تسبيحة اليوم</Text>
          </View>
        </Pressable>
        {store.tasbeehGoal ? (
          <View style={{ alignSelf: "stretch", gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: completed ? colors.gold : colors.muted, fontWeight: "800" }}>{completed ? "أحسنت، وصلت لهدفك!" : `متبقي ${remaining}`}</Text>
              <Text style={{ color: colors.text, fontWeight: "700" }}>الهدف {goal}</Text>
            </View>
            <ProgressBar value={count} max={goal} color={colors.gold} />
          </View>
        ) : <Text style={{ color: colors.muted }}>حدد هدفًا يوميًا يناسب وقتك، أو سبّح بلا هدف محدد.</Text>}
        <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
          <SulyButton title="تسبيحة" onPress={increment} />
          <SulyButton title="تراجع مرة" secondary disabled={count === 0} onPress={() => updateStore((current) => ({ ...current, tasbeehCounts: { ...current.tasbeehCounts, [today]: Math.max(0, (current.tasbeehCounts[today] ?? 0) - 1) } }))} />
        </View>
      </SulyCard>

      <SulyCard>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800", textAlign: "right" }}>اختر الذكر الذي تحب تردده</Text>
        <View style={{ gap: 8 }}>
          {dhikrOptions.map((item) => {
            const active = item.id === selectedId;
            return <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: active ? colors.gold : colors.border, backgroundColor: active ? colors.surface : colors.card, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <MaterialCommunityIcons name={active ? "radiobox-marked" : "radiobox-blank"} size={21} color={active ? colors.gold : colors.muted} />
              <Text style={{ flex: 1, color: active ? colors.gold : colors.text, textAlign: "right", fontWeight: "700", fontSize: 15 }}>{item.title}</Text>
            </Pressable>;
          })}
        </View>
        <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 23 }}>{selected.note}</Text>
        <View style={{ padding: 12, backgroundColor: colors.surface, borderRadius: 13, gap: 6 }}>
          <Text style={{ color: colors.gold, textAlign: "right", fontWeight: "800" }}>التوثيق</Text>
          <Text style={{ color: colors.text, textAlign: "right", fontSize: 13 }}>{selected.source}</Text>
          <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>اضغط لفتح نص الحديث ومراجعته.</Text>
          <SulyButton title="فتح مصدر الحديث" secondary onPress={() => void Linking.openURL(selected.url).catch(() => setNotice("تعذر فتح المصدر على هذا الجهاز."))} />
        </View>
      </SulyCard>

      <SulyCard style={{ gap: 10 }}>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800", textAlign: "right" }}>هدفك اليومي</Text>
        <Text style={{ color: colors.muted, textAlign: "right" }}>اختار رقمًا واقعيًا؛ الهدف للتشجيع وليس للمنافسة أو الضغط.</Text>
        <TextInput value={goalDraft} onChangeText={setGoalDraft} keyboardType="number-pad" placeholder="مثال: 100" placeholderTextColor={colors.muted} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 13, color: colors.text, textAlign: "right", backgroundColor: colors.surface }} />
        <SulyButton title="حفظ الهدف" onPress={saveGoal} />
      </SulyCard>

      <SulyCard style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <MaterialCommunityIcons name="bell-ring-outline" size={24} color={colors.gold} />
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>تذكير لطيف لو الهدف لسه ما اكتملش</Text>
        </View>
        <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 22 }}>سيصلك إشعار يومي على الأجهزة التي تدعم الإشعارات في الوقت الذي تختاره. عند إكمال هدفك يتوقف التذكير تلقائيًا.</Text>
        <TextInput value={timeDraft} onChangeText={setTimeDraft} placeholder="20:00" placeholderTextColor={colors.muted} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 13, color: colors.text, textAlign: "center", backgroundColor: colors.surface }} />
        <SulyButton title={store.tasbeehReminderEnabled ? "إيقاف التذكير اليومي" : "تفعيل التذكير اليومي"} secondary onPress={() => void toggleReminder()} />
        {store.tasbeehReminderEnabled ? <Text style={{ color: colors.gold, textAlign: "center" }}>التذكير مضبوط يوميًا الساعة {store.tasbeehReminderTime}</Text> : null}
        {notice ? <Text style={{ color: colors.gold, textAlign: "right" }}>{notice}</Text> : null}
      </SulyCard>
    </AppScreen>
  );
}
