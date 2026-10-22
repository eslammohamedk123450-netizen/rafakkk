import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { AppStore } from "@/lib/app-store";
import { nextPrayerDates } from "@/lib/prayer/dates";
import { localDateTimeToUtc } from "@/lib/time-zones";

export const MOTIVATION_MESSAGES = {
  prayer: ["إذا جاء وقت الصلاة، خذ لحظة هادئة وابدأ بما تستطيع.", "موعد الصلاة مساحة قصيرة للعودة إلى يومك بهدوء."],
  repentance: ["البدء من جديد متاح، خطوة صغيرة في الوقت الذي يناسبك.", "امنح نفسك فرصة للعودة إلى ما تحب من الخير."],
  istighfar: ["اجعل للاستغفار مساحة من يومك، بالقدر الذي يناسبك.", "لحظات الاستغفار لا تحتاج إلى استعجال."],
  quran: ["صفحة واحدة بتركيز قد تكون بداية طيبة لوردك.", "اختر مقدارًا من القراءة ينسجم مع وقتك اليوم."],
  dhikr: ["وقفة قصيرة للذكر متاحة متى وجدت لها وقتًا.", "تذكّر ما يطمئنك، دون أن تثقل على يومك."],
  encouragement: ["تقدمك هنا هو ما اخترت تسجيله، وليس مقياسًا لقيمتك.", "يكفي أن تختار خطوة تناسب يومك."],
} as const;

type MessageCategory = keyof typeof MOTIVATION_MESSAGES;

function isQuietTime(clock: string, quietStart: string, quietEnd: string) {
  if (!/^\d{2}:\d{2}$/.test(quietStart) || !/^\d{2}:\d{2}$/.test(quietEnd)) return false;
  if (quietStart === quietEnd) return false;
  return quietStart < quietEnd ? clock >= quietStart && clock < quietEnd : clock >= quietStart || clock < quietEnd;
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
  const times = prefs.messageTimes.filter((clock) => /^([01]\d|2[0-3]):[0-5]\d$/.test(clock)).slice(0, Math.max(1, Math.min(8, prefs.dailyLimit)));
  if (!categories.length || !times.length) return;
  const timeZone = store.location?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const days = nextPrayerDates(new Date(), timeZone, 8);
  const seenByCategory = new Map<MessageCategory, number>();
  const firstDayOffset = Math.floor(Date.parse(`${days[0]?.key ?? "1970-01-01"}T00:00:00Z`) / 86_400_000);
  const now = Date.now();
  const jobs: Array<Promise<string>> = [];
  days.forEach(({ key }, dayIndex) => {
    times.forEach((clock, timeIndex) => {
      if (isQuietTime(clock, prefs.quietStart, prefs.quietEnd)) return;
      // A wall-clock time skipped by the DST spring-forward transition is not scheduled
      // at an unrelated hour; the next daily occurrence will be recalculated normally.
      const scheduledAt = localDateTimeToUtc(key, clock, timeZone, now);
      if (!scheduledAt || scheduledAt.getTime() <= now) return;
      const category = categories[(dayIndex * times.length + timeIndex) % categories.length];
      const messages = MOTIVATION_MESSAGES[category];
      const occurrence = seenByCategory.get(category) ?? 0;
      const message = messages[(firstDayOffset + occurrence) % messages.length];
      seenByCategory.set(category, occurrence + 1);
      jobs.push(Notifications.scheduleNotificationAsync({
        content: { title: "وقفة لطيفة", body: message, data: { kind: "suly-gentle", category } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: scheduledAt, ...(Platform.OS === "android" ? { channelId: "suly-prayer" } : {}) },
      }));
    });
  });
  await Promise.all(jobs);
}
