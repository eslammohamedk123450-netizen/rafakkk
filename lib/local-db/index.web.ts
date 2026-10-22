import AsyncStorage from "@react-native-async-storage/async-storage";

export type ContentRecord = {
  id: string;
  category: string;
  title: string;
  body: string;
  repetition?: string | null;
  sourceName: string;
  sourceReference: string;
  sourceUrl: string;
  authenticity?: string | null;
};

export type StoredContentRecord = ContentRecord & { origin: "builtin" | "published" };

const WEB_STATE_PREFIX = "suly-local-state:";
const WEB_CONTENT_KEY = "suly-local-content";
const WEB_CONTENT_VERSION_KEY = "suly-content-version";

export async function initializeLocalDatabase() {}

export async function readLocalState<T>(key: string, fallback: T): Promise<T> {
  const saved = await AsyncStorage.getItem(`${WEB_STATE_PREFIX}${key}`);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

export async function writeLocalState<T>(key: string, value: T) {
  await AsyncStorage.setItem(`${WEB_STATE_PREFIX}${key}`, JSON.stringify(value));
}

export async function getContentVersion() {
  return (await AsyncStorage.getItem(WEB_CONTENT_VERSION_KEY)) ?? "builtin-1";
}

export async function getContentEntries(): Promise<StoredContentRecord[]> {
  const saved = await AsyncStorage.getItem(WEB_CONTENT_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved) as StoredContentRecord[];
  } catch {
    return [];
  }
}

export async function installBuiltinContent(entries: ContentRecord[]) {
  const existing = await getContentEntries();
  if (existing.length === 0 && entries.length > 0) {
    await AsyncStorage.setItem(WEB_CONTENT_KEY, JSON.stringify(entries.map((entry) => ({ ...entry, origin: "builtin" }))));
  }
}

export async function applyPublishedContent(entries: ContentRecord[], version: string) {
  const builtin = (await getContentEntries()).filter((entry) => entry.origin === "builtin");
  const published = entries.map((entry) => ({ ...entry, origin: "published" as const }));
  await AsyncStorage.setItem(WEB_CONTENT_KEY, JSON.stringify([...builtin, ...published]));
  await AsyncStorage.setItem(WEB_CONTENT_VERSION_KEY, version);
}
