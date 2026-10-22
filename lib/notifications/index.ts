import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { PrayerId } from "@/lib/app-store";
import { PRAYER_LABELS, type DailyPrayerTimes } from "@/lib/prayer/calculations";

export type PrayerNotificationPrefs = Record<PrayerId, {
  enabled: boolean;
  atTime: boolean;
  beforeMinutes: number;
  followupMinutes: number;
  silent: boolean;
}>;

export async function prepareNotificationChannel() {
  if (Platform.OS !== "android") return;
  await Promise.all([
    Notifications.setNotificationChannelAsync("suly-prayer", {
      name: "تذكيرات الصلاة",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 120, 180],
      sound: "default",
    }),
    Notifications.setNotificationChannelAsync("suly-prayer-silent", {
      name: "تذكيرات الصلاة الصامتة",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [],
      sound: null,
    }),
  ]);
}

export async function requestNotificationPermission() {
  if (Platform.OS === "web") return false;
  await prepareNotificationChannel();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function reschedulePrayerNotifications(
  enabled: boolean,
  preferences: PrayerNotificationPrefs,
  days: Array<{ date: Date; dateKey: string; times: DailyPrayerTimes }>,
  prayerLogs: Record<string, Partial<Record<PrayerId, "completed" | "noted">>> = {},
) {
  if (Platform.OS === "web") return;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const appReminders = existing.filter((item) => item.content.data?.kind === "suly-prayer");
  await Promise.all(appReminders.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  if (!enabled) return;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  await prepareNotificationChannel();
  const now = Date.now();
  const schedules: Array<Promise<string>> = [];
  for (const day of days) {
    for (const prayerId of Object.keys(PRAYER_LABELS) as PrayerId[]) {
      const prefs = preferences[prayerId];
      if (!prefs?.enabled) continue;
      const prayerTime = day.times[prayerId];
      const alerts: Array<{ at: Date; suffix: string }> = [];
      if (prefs.atTime) alerts.push({ at: prayerTime, suffix: "دخل وقت" });
      if (prefs.beforeMinutes > 0) {
        alerts.push({ at: new Date(prayerTime.getTime() - prefs.beforeMinutes * 60_000), suffix: `باقي ${prefs.beforeMinutes} دقيقة على` });
      }
      if (prefs.followupMinutes > 0 && prayerLogs[day.dateKey]?.[prayerId] !== "completed") {
        alerts.push({ at: new Date(prayerTime.getTime() + prefs.followupMinutes * 60_000), suffix: "تذكير اختياري بشأن" });
      }
      for (const alert of alerts) {
        if (alert.at.getTime() <= now) continue;
        schedules.push(Notifications.scheduleNotificationAsync({
          content: {
            title: `${alert.suffix} صلاة ${PRAYER_LABELS[prayerId]}`,
            body: alert.suffix === "تذكير اختياري بشأن" ? "إن كنت قد صليت، يمكنك تسجيلها؛ وإن لم يكن التنبيه مناسبًا فتجاهله." : "خذ لحظة هادئة، وسجّل صلاتك حين ترغب.",
            sound: prefs.silent ? false : "default",
            data: { kind: "suly-prayer", prayerId, dateKey: day.dateKey, phase: alert.suffix },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: alert.at,
            ...(Platform.OS === "android" ? { channelId: prefs.silent ? "suly-prayer-silent" : "suly-prayer" } : {}),
          },
        }));
      }
    }
  }
  await Promise.all(schedules);
}
