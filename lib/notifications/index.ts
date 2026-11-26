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
    Notifications.setNotificationChannelAsync("suly-adhan-1", {
      name: "الأذان 1",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 150, 250],
      sound: "adhan_1.mp3",
      audioAttributes: { usage: Notifications.AndroidAudioUsage.ALARM, contentType: Notifications.AndroidAudioContentType.MUSIC },
    }),
    Notifications.setNotificationChannelAsync("suly-adhan-2", {
      name: "الأذان 2",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 150, 250],
      sound: "adhan_2.mp3",
      audioAttributes: { usage: Notifications.AndroidAudioUsage.ALARM, contentType: Notifications.AndroidAudioContentType.MUSIC },
    }),
  ]);
}

export async function requestAdhanPermissions() {
  if (Platform.OS === "web") return false;
  const notificationsGranted = await requestNotificationPermission();
  if (!notificationsGranted) return false;
  if (Platform.OS === "android") {
    const exact = await Notifications.getExactAlarmPermissionsAsync();
    if (!exact.granted) {
      const requested = await Notifications.requestExactAlarmPermissionsAsync();
      if (!requested.granted) return false;
    }
  }
  return true;
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
  adhanPrefs?: { enabled: boolean; voiceId: string; prayers: Record<PrayerId, boolean> },
) {
  if (Platform.OS === "web") return;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const appReminders = existing.filter((item) => item.content.data?.kind === "suly-prayer" || item.content.data?.kind === "suly-adhan");
  await Promise.all(appReminders.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  if (!enabled && !adhanPrefs?.enabled) return;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  await prepareNotificationChannel();
  const exactPermission = Platform.OS === "android" ? await Notifications.getExactAlarmPermissionsAsync() : { granted: false };
  const now = Date.now();
  const schedules: Array<Promise<string>> = [];
  for (const day of days) {
    for (const prayerId of Object.keys(PRAYER_LABELS) as PrayerId[]) {
      const prayerTime = day.times[prayerId];
      const prefs = preferences[prayerId];
      if (enabled && prefs?.enabled) {
        const alerts: Array<{ at: Date; suffix: string }> = [];
        if (prefs.atTime) alerts.push({ at: prayerTime, suffix: "دخل وقت" });
        if (prefs.beforeMinutes > 0) alerts.push({ at: new Date(prayerTime.getTime() - prefs.beforeMinutes * 60_000), suffix: "باقي " + prefs.beforeMinutes + " دقيقة على" });
        if (prefs.followupMinutes > 0 && prayerLogs[day.dateKey]?.[prayerId] !== "completed") alerts.push({ at: new Date(prayerTime.getTime() + prefs.followupMinutes * 60_000), suffix: "تذكير اختياري بشأن" });
        for (const alert of alerts) {
          if (alert.at.getTime() <= now) continue;
          schedules.push(Notifications.scheduleNotificationAsync({
            content: {
              title: alert.suffix + " صلاة " + PRAYER_LABELS[prayerId],
              body: alert.suffix === "تذكير اختياري بشأن" ? "إن كنت قد صليت، يمكنك تسجيلها؛ وإن لم يكن التنبيه مناسبًا فتجاهله." : "خذ لحظة هادئة، وسجّل صلاتك حين ترغب.",
              sound: prefs.silent ? false : "default",
              data: { kind: "suly-prayer", prayerId, dateKey: day.dateKey, phase: alert.suffix },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: alert.at,
              ...(Platform.OS === "android" ? { channelId: prefs.silent ? "suly-prayer-silent" : "suly-prayer", delivery: "bestEffort" } : {}),
            },
          }));
        }
      }

      if (adhanPrefs?.enabled && adhanPrefs.prayers[prayerId] && prayerTime.getTime() > now) {
        const voiceId = adhanPrefs.voiceId === "adhan-2" ? "adhan-2" : "adhan-1";
        const sound = voiceId === "adhan-2" ? "adhan_2.mp3" : "adhan_1.mp3";
        schedules.push(Notifications.scheduleNotificationAsync({
          content: {
            title: "حان الآن وقت صلاة " + PRAYER_LABELS[prayerId],
            body: "حان وقت الصلاة.",
            sound,
            data: { kind: "suly-adhan", prayerId, dateKey: day.dateKey, voiceId },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: prayerTime,
            ...(Platform.OS === "android" ? { channelId: "suly-" + voiceId, delivery: exactPermission.granted ? "alarmClock" : "bestEffort" } : {}),
          },
        }));
      }
    }
  }
  await Promise.all(schedules);
}
