import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { localDateKey, useAppStore } from "@/lib/app-store";
import { buildPrayerScheduleDays, shiftDateKey } from "@/lib/prayer/dates";
import { reschedulePrayerNotifications } from "@/lib/notifications";
import { rescheduleMotivationNotifications } from "@/lib/notifications/motivation";
import { localDateTimeToUtc } from "@/lib/time-zones";

let scheduleQueue = Promise.resolve();

function enqueueSchedule(task: () => Promise<void>) {
  scheduleQueue = scheduleQueue.then(task).catch((error) => {
    console.warn("Unable to refresh local Suly notifications", error);
  });
}

function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function NotificationReconciler() {
  const { store, hydrated, updateStore } = useAppStore();
  const [foregroundCycle, setForegroundCycle] = useState(0);
  const [dayCycle, setDayCycle] = useState(0);
  const [systemTimeZone, setSystemTimeZone] = useState(deviceTimeZone);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const refreshSystemTimeZone = () => setSystemTimeZone(deviceTimeZone());
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshSystemTimeZone();
        setForegroundCycle((value) => value + 1);
      }
    });
    const interval = setInterval(refreshSystemTimeZone, 60_000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const location = store.location;
    if (!hydrated || !location || location.source !== "device" || !systemTimeZone || location.timeZone === systemTimeZone) return;
    updateStore((current) => current.location?.source === "device"
      ? { ...current, location: { ...current.location, timeZone: systemTimeZone } }
      : current);
  }, [hydrated, store.location, systemTimeZone, updateStore]);

  const timeZone = store.location?.timeZone || systemTimeZone;
  useEffect(() => {
    if (Platform.OS === "web") return;
    const now = new Date();
    const todayKey = localDateKey(now, timeZone);
    const tomorrowKey = shiftDateKey(todayKey, 1);
    const nextReconcile = localDateTimeToUtc(tomorrowKey, "00:10", timeZone, now.getTime());
    const delay = nextReconcile ? Math.max(1_000, nextReconcile.getTime() - Date.now()) : 60 * 60 * 1000;
    const timer = setTimeout(() => setDayCycle((value) => value + 1), delay);
    return () => clearTimeout(timer);
  }, [timeZone, dayCycle]);

  useEffect(() => {
    if (!hydrated || Platform.OS === "web") return;
    enqueueSchedule(async () => {
      const location = store.location;
      const days = location
        ? buildPrayerScheduleDays(location, store.calculationMethod, store.asrSchool, 8)
        : [];
      await reschedulePrayerNotifications(
        Boolean(location && store.notificationPrefs.enabled),
        store.notificationPrefs.prayers,
        days,
        store.prayerLogs,
        store.adhanPrefs,
      );
      await rescheduleMotivationNotifications(store);
    });
  }, [hydrated, foregroundCycle, dayCycle, systemTimeZone, store.location?.latitude, store.location?.longitude, store.location?.timeZone, store.location?.source, store.calculationMethod, store.asrSchool, store.notificationPrefs, store.adhanPrefs, store.prayerLogs]);

  return null;
}
