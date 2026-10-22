import { localDateKey } from "@/lib/app-store";

export function dateKeyInZone(date: Date, timeZone?: string) {
  return localDateKey(date, timeZone);
}

export function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function shiftDateKey(key: string, amount: number) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, "0")}-${`${date.getUTCDate()}`.padStart(2, "0")}`;
}

export function nextPrayerDates(from: Date, timeZone: string | undefined, count: number) {
  const todayKey = dateKeyInZone(from, timeZone);
  return Array.from({ length: count }, (_, index) => {
    const key = shiftDateKey(todayKey, index);
    return { key, date: dateFromKey(key) };
  });
}

export function buildPrayerScheduleDays(
  location: { latitude: number; longitude: number; timeZone?: string },
  method: string,
  asrSchool: "shafi" | "hanafi",
  count = 8,
  from = new Date(),
) {
  return nextPrayerDates(from, location.timeZone, count).map(({ key, date }) => ({
    dateKey: key,
    date,
    times: calculateFor(date),
  }));

  function calculateFor(date: Date) {
    return calculatePrayerTimes(location.latitude, location.longitude, date, method, asrSchool);
  }
}
import { calculatePrayerTimes } from "@/lib/prayer/calculations";
