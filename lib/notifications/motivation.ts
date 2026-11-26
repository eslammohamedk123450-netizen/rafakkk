import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { AppStore } from "@/lib/app-store";
import { nextPrayerDates, shiftDateKey } from "@/lib/prayer/dates";
import { localDateTimeToUtc } from "@/lib/time-zones";

export const MOTIVATION_MESSAGES = {
  prayer: [
    "حين يحين وقت الصلاة، اترك للدنيا دقائق واذهب إلى ما يطمئن قلبك.",
    "الصلاة ليست عبئًا على يومك؛ هي راحة لقلبك ووقفة بين يدي ربك.",
    "خذ نفسًا هادئًا، توضأ، وقف بين يدي الله بما تستطيع.",
  ],
  repentance: [
    "باب الرجوع إلى الله مفتوح، ابدأ من جديد ولو بخطوة صغيرة.",
    "لا تجعل تعثّر الأمس يمنعك من خير اليوم. ربنا رحيم.",
    "كل يوم فرصة جديدة للقرب من الله، خذها برفق.",
  ],
  istighfar: [
    "لو عندك دقيقة، خلّيها استغفارًا يطمئن قلبك.",
    "استغفر الله وأقبل على يومك بقلب يرجو رحمة ربنا.",
    "على مهل، ردد: أستغفر الله وأتوب إليه.",
  ],
  quran: [
    "صفحة واحدة بتدبر قد تكون بداية جميلة لوردك اليوم.",
    "افتح المصحف ولو لدقائق؛ اجعل للقرآن نصيبًا من يومك.",
    "خذ وقتك مع كلام الله، فالقليل المستمر خير من الانقطاع.",
  ],
  dhikr: [
    "اذكر الله بقلب حاضر، ولو لدقيقة واحدة.",
    "سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر.",
    "وقفة ذكر صغيرة قد تعيد لقلبك هدوءه.",
  ],
  encouragement: [
    "مش لازم تكون كامل؛ المهم تفضل راجع لربنا كل ما تتعثر.",
    "خطوة خير صغيرة النهارده تستحق إنك تفرح بيها.",
    "رفيقك هنا يشجعك، مش بيحاسبك. ابدأ من حيث أنت.",
  ],
} as const;

type MessageCategory = keyof typeof MOTIVATION_MESSAGES;

function isQuietTime(clock: string, quietStart: string, quietEnd: string) {
  if (!/^\\d{2}:\\d{2}$/.test(quietStart) || !/^\\d{2}:\\d{2}$/.test(quietEnd)) return false;
  if (quietStart === quietEnd) return false;
  return quietStart < quietEnd ? clock >= quietStart && clock < quietEnd : clock >= quietStart || clock < quietEnd;
}

function shiftDateKey(key: string, amount: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function hasQuranActivity(store: AppStore, key: string) {
  return (store.quranReader.pagesReadByDate[key]?.length ?? 0) > 0 || (store.quranHistory[key] ?? 0) > 0;
}

function personalizedMessage(category: MessageCategory, store: AppStore, dayKey: string, currentDayKey: string, index: number) {
  const todayQuran = hasQuranActivity(store, dayKey);
  const yesterdayQuran = hasQuranActivity(store, shiftDateKey(dayKey, -1));
  const prayerCount = Object.values(store.prayerLogs[dayKey] ?? {}).filter((status) => status === "completed").length;
  const dhikrCount = Object.values(store.dhikrCounts[dayKey] ?? {}).reduce((sum, value) => sum + value, 0) + (store.tasbeehCounts[dayKey] ?? 0);

  if (category === "quran" && dayKey === currentDayKey) {
    if (todayQuran) return "ما شاء الله، سجلت قراءة للقرآن اليوم. ربنا يثبتك ويجعل القرآن نور قلبك.";
    if (yesterdayQuran) return "كان لك نصيب من القرآن أمس. لو ما بدأتش وردك النهارده، افتح المصحف ولو بصفحة؛ رفيقك بيفكّرك بمحبة.";
  }
  if (category === "prayer" && prayerCount > 0 && dayKey === currentDayKey) {
    return prayerCount >= 5
      ? "ما شاء الله، سجلت صلواتك الخمس اليوم. تقبّل الله منك، وداوم على الخير."
      : `سجلت ${prayerCount} من صلوات اليوم. ربنا يثبتك، ولسه قدامك فرص جميلة للخير.`;
  }
  if (category === "dhikr" && dhikrCount > 0 && dayKey === currentDayKey) {
    return `ما شاء الله، سجلت ${dhikrCount} من الأذكار اليوم. تقبّل الله ذكرك، وزاد قلبك طمأنينة.`;
  }
  const messages = MOTIVATION_MESSAGES[category];
  return messages[index % messages.length];
}

export async function rescheduleMotivationNotifications(store: AppStore) {
  if (Platform.OS === "web") return;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const previous = existing.filter((item) => item.content.data?.kind === "suly-gentle");
  await Promise.all(previous.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  const prefs = store.notificationPrefs;
  if (!prefs.gentleMessages) return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const categories = (Object.keys(MOTIVATION_MESSAGES) as MessageCategory[]).filter((key) => prefs.messageCategories[key]);
  const times = prefs.messageTimes.filter((clock) => /^([01]\\d|2[0-3]):[0-5]\\d$/.test(clock)).slice(0, Math.max(1, Math.min(8, prefs.dailyLimit)));
  if (!categories.length || !times.length) return;
  const timeZone = store.location?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const days = nextPrayerDates(new Date(), timeZone, 8);\n  const currentDayKey = days[0]?.key ?? "";
  const seenByCategory = new Map<MessageCategory, number>();
  const firstDayOffset = Math.floor(Date.parse(`${days[0]?.key ?? "1970-01-01"}T00:00:00Z`) / 86_400_000);
  const now = Date.now();
  const jobs: Array<Promise<string>> = [];
  days.forEach(({ key }, dayIndex) => {
    times.forEach((clock, timeIndex) => {
      if (isQuietTime(clock, prefs.quietStart, prefs.quietEnd)) return;
      const scheduledAt = localDateTimeToUtc(key, clock, timeZone, now);
      if (!scheduledAt || scheduledAt.getTime() <= now) return;
      const category = categories[(dayIndex * times.length + timeIndex) % categories.length];
      const occurrence = seenByCategory.get(category) ?? 0;
      const message = personalizedMessage(category, store, key, currentDayKey, firstDayOffset + occurrence);
      seenByCategory.set(category, occurrence + 1);
      jobs.push(Notifications.scheduleNotificationAsync({
        content: { title: "رفيقك بيفكّرك ❤️", body: message, data: { kind: "suly-gentle", category, dateKey: key } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: scheduledAt, ...(Platform.OS === "android" ? { channelId: "suly-prayer" } : {}) },
      }));
    });
  });
  await Promise.all(jobs);
}
