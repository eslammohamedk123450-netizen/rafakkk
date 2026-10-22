import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "adhan";
import type { PrayerId } from "@/lib/app-store";

export const PRAYER_LABELS: Record<PrayerId, string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

export const CALCULATION_METHODS = [
  { id: "MuslimWorldLeague", label: "رابطة العالم الإسلامي" },
  { id: "Egyptian", label: "الهيئة المصرية العامة للمساحة" },
  { id: "Karachi", label: "جامعة العلوم الإسلامية بكراتشي" },
  { id: "UmmAlQura", label: "أم القرى" },
  { id: "NorthAmerica", label: "إسنا / أمريكا الشمالية" },
  { id: "Singapore", label: "سنغافورة" },
] as const;

function getCalculationParameters(method: string, asrSchool: "shafi" | "hanafi") {
  const methods: Record<string, () => ReturnType<typeof CalculationMethod.MuslimWorldLeague>> = {
    MuslimWorldLeague: CalculationMethod.MuslimWorldLeague,
    Egyptian: CalculationMethod.Egyptian,
    Karachi: CalculationMethod.Karachi,
    UmmAlQura: CalculationMethod.UmmAlQura,
    NorthAmerica: CalculationMethod.NorthAmerica,
    Singapore: CalculationMethod.Singapore,
  };
  const parameters = (methods[method] ?? CalculationMethod.Egyptian)();
  parameters.madhab = asrSchool === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  return parameters;
}

export type DailyPrayerTimes = Record<PrayerId, Date>;

export function calculatePrayerTimes(
  latitude: number,
  longitude: number,
  date: Date,
  method = "Egyptian",
  asrSchool: "shafi" | "hanafi" = "shafi",
): DailyPrayerTimes {
  const coordinates = new Coordinates(latitude, longitude);
  const times = new PrayerTimes(coordinates, date, getCalculationParameters(method, asrSchool));
  return {
    fajr: times.fajr,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}

export function formatPrayerTime(date: Date, timeZone?: string) {
  try {
    return new Intl.DateTimeFormat("ar", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      ...(timeZone ? { timeZone } : {}),
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("ar", { hour: "numeric", minute: "2-digit", hour12: true }).format(date);
  }
}

export function getNextPrayer(times: DailyPrayerTimes, now = new Date()) {
  const ordered = (Object.keys(PRAYER_LABELS) as PrayerId[]).map((id) => ({
    id,
    name: PRAYER_LABELS[id],
    time: times[id],
  }));
  return ordered.find((item) => item.time.getTime() > now.getTime()) ?? null;
}
