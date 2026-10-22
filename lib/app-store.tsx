import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { initializeLocalDatabase, installBuiltinContent, readLocalState, writeLocalState } from "@/lib/local-db";
import { BUILTIN_CONTENT } from "@/lib/content/seed";
import type { QuranPlanMode } from "@/lib/quran/progress";

export type ThemeChoice = "system" | "light" | "dark";
export type PrayerId = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
export type PrayerStatus = "completed" | "noted";

export type AppStore = {
  theme: ThemeChoice;
  location: { name: string; latitude: number; longitude: number; timeZone?: string; source?: "device" | "manual" } | null;
  calculationMethod: string;
  asrSchool: "shafi" | "hanafi";
  prayerLogs: Record<string, Partial<Record<PrayerId, PrayerStatus>>>;
  naflLogs: Record<string, string[]>;
  quranPlan: {
    mode: QuranPlanMode;
    target: number;
    completed: number;
    sessionsPerDay: number;
    sessionTimes: string[];
    surahName?: string;
    passage?: string;
    targetEndDate?: string;
  };
  quranHistory: Record<string, number>;
  quranHistoryModes: Record<string, QuranPlanMode>;
  quranReader: {
    lastPage: number;
    bookmarkPage: number | null;
    pagesReadByDate: Record<string, number[]>;
  };
  dhikrCounts: Record<string, Record<string, number>>;
  tasbeehCounts: Record<string, number>;
  favorites: string[];
  customDhikr: Array<{
    id: string;
    title: string;
    body: string;
    target: number;
    category: string;
  }>;
  dhikrGoal: number | null;
  tasbeehGoal: number | null;
  notificationPrefs: {
    enabled: boolean;
    prayers: Record<PrayerId, { enabled: boolean; atTime: boolean; beforeMinutes: number; followupMinutes: number; silent: boolean }>;
    gentleMessages: boolean;
    messageCategories: Record<"prayer" | "repentance" | "istighfar" | "quran" | "dhikr" | "encouragement", boolean>;
    messageTimes: string[];
    dailyLimit: number;
    quietStart: string;
    quietEnd: string;
  };
  scoreEnabled: boolean;
}

const defaultStore: AppStore = {
  theme: "system",
  location: null,
  calculationMethod: "Egyptian",
  asrSchool: "shafi",
  prayerLogs: {},
  naflLogs: {},
  quranPlan: {
    mode: "pages",
    target: 5,
    completed: 0,
    sessionsPerDay: 1,
    sessionTimes: ["18:00"],
    surahName: "",
    passage: "",
  },
  quranHistory: {},
  quranHistoryModes: {},
  quranReader: { lastPage: 1, bookmarkPage: null, pagesReadByDate: {} },
  dhikrCounts: {},
  tasbeehCounts: {},
  favorites: [],
  customDhikr: [],
  dhikrGoal: null,
  tasbeehGoal: null,
  notificationPrefs: {
    enabled: false,
    prayers: {
      fajr: { enabled: false, atTime: true, beforeMinutes: 0, followupMinutes: 0, silent: false },
      dhuhr: { enabled: false, atTime: true, beforeMinutes: 0, followupMinutes: 0, silent: false },
      asr: { enabled: false, atTime: true, beforeMinutes: 0, followupMinutes: 0, silent: false },
      maghrib: { enabled: false, atTime: true, beforeMinutes: 0, followupMinutes: 0, silent: false },
      isha: { enabled: false, atTime: true, beforeMinutes: 0, followupMinutes: 0, silent: false },
    },
    gentleMessages: false,
    messageCategories: { prayer: false, repentance: false, istighfar: false, quran: false, dhikr: false, encouragement: false },
    messageTimes: ["09:00", "14:00", "19:00"],
    dailyLimit: 3,
    quietStart: "22:00",
    quietEnd: "07:00",
  },
  scoreEnabled: false,
};

const StoreContext = createContext<{
  store: AppStore;
  hydrated: boolean;
  updateStore: (update: Partial<AppStore> | ((current: AppStore) => AppStore)) => void;
} | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<AppStore>(defaultStore);
  const [hydrated, setHydrated] = useState(false);
  const currentRef = useRef(store);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    initializeLocalDatabase()
      .then(() => installBuiltinContent(BUILTIN_CONTENT))
      .then(() => readLocalState<AppStore>("app", defaultStore))
      .then((saved) => {
        if (!active) return;
        const merged = { ...defaultStore, ...saved };
        currentRef.current = merged;
        setStore(merged);
      })
      .catch((error) => {
        console.warn("Unable to initialize local Suly data", error);
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateStore = useCallback((update: Partial<AppStore> | ((current: AppStore) => AppStore)) => {
    const next = typeof update === "function" ? update(currentRef.current) : { ...currentRef.current, ...update };
    currentRef.current = next;
    setStore(next);
    saveQueue.current = saveQueue.current.then(() => writeLocalState("app", next)).catch((error) => {
      console.warn("Unable to save local Suly data", error);
    });
  }, []);

  const value = useMemo(() => ({ store, hydrated, updateStore }), [store, hydrated, updateStore]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useAppStore must be used inside AppStoreProvider");
  return context;
}

export function localDateKey(date = new Date(), timeZone?: string) {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);
      const part = Object.fromEntries(parts.map((entry) => [entry.type, entry.value]));
      return `${part.year}-${part.month}-${part.day}`;
    } catch {
      // Fall back to the device's current calendar if the saved timezone is invalid.
    }
  }
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export { defaultStore };
