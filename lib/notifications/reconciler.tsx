import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { useAppStore } from "@/lib/app-store";
import { buildPrayerScheduleDays } from "@/lib/prayer/dates";
import { reschedulePrayerNotifications } from "@/lib/notifications";
import { rescheduleMotivationNotifications } from "@/lib/notifications/motivation";

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
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const location = store.location;
    if (!hydrated || !location || location.source !== "device" || !systemTimeZone || location.timeZone === systemTimeZone) return;
    updateStore((current) => current.location?.source === "device"
      ? { ...current, location: { ...current.location, timeZone: systemTimeZone } }
      : current);
  }, [hydrated, store.location, systemTimeZone, updateStore]);

  useEffect(() => {
    if (!hydrated || Platform.OS === "web") return;
    enqueueSchedule(async () => {
      const location = store.location;
      const days = location
        ? buildPrayerScheduleDays(location, store.calculationMethod, store.asrSchool, 21)
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
  }, [hydrated, foregroundCycle, systemTimeZone, store.location?.latitude, store.location?.longitude, store.location?.timeZone, store.location?.source, store.calculationMethod, store.asrSchool, store.notificationPrefs, store.adhanPrefs, store.prayerLogs, store.quranReader.pagesReadByDate, store.quranHistory, store.dhikrCounts, store.tasbeehCounts]);

  return null;
}
