import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

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

export type StoredContentRecord = ContentRecord & {
  origin: "builtin" | "published";
};

const WEB_STATE_PREFIX = "suly-local-state:";
const WEB_CONTENT_KEY = "suly-local-content";
let databasePromise: ReturnType<typeof SQLite.openDatabaseAsync> | null = null;
let initializationPromise: Promise<void> | null = null;

function getDatabase() {
  databasePromise ??= SQLite.openDatabaseAsync("suly.db");
  return databasePromise;
}

export async function initializeLocalDatabase() {
  if (Platform.OS === "web") return;
  initializationPromise ??= (async () => {
    const db = await getDatabase();
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS content_entries (
        id TEXT PRIMARY KEY NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        repetition TEXT,
        source_name TEXT NOT NULL,
        source_reference TEXT NOT NULL,
        source_url TEXT NOT NULL,
        authenticity TEXT,
        origin TEXT NOT NULL CHECK(origin IN ('builtin', 'published')),
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS content_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  })();
  return initializationPromise;
}

export async function readLocalState<T>(key: string, fallback: T): Promise<T> {
  await initializeLocalDatabase();
  if (Platform.OS === "web") {
    const saved = await AsyncStorage.getItem(`${WEB_STATE_PREFIX}${key}`);
    if (!saved) return fallback;
    try {
      return JSON.parse(saved) as T;
    } catch {
      return fallback;
    }
  }
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_state WHERE key = ?",
    key,
  );
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function writeLocalState<T>(key: string, value: T) {
  await initializeLocalDatabase();
  const serialized = JSON.stringify(value);
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(`${WEB_STATE_PREFIX}${key}`, serialized);
    return;
  }
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    key,
    serialized,
  );
}

export async function getContentVersion() {
  await initializeLocalDatabase();
  if (Platform.OS === "web") {
    return (await AsyncStorage.getItem("suly-content-version")) ?? "builtin-1";
  }
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM content_meta WHERE key = 'version'",
  );
  return row?.value ?? "builtin-1";
}

export async function getContentEntries(): Promise<StoredContentRecord[]> {
  await initializeLocalDatabase();
  if (Platform.OS === "web") {
    const saved = await AsyncStorage.getItem(WEB_CONTENT_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved) as StoredContentRecord[];
    } catch {
      return [];
    }
  }
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    category: string;
    title: string;
    body: string;
    repetition: string | null;
    source_name: string;
    source_reference: string;
    source_url: string;
    authenticity: string | null;
    origin: "builtin" | "published";
  }>("SELECT * FROM content_entries ORDER BY category, title");
  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    repetition: row.repetition,
    sourceName: row.source_name,
    sourceReference: row.source_reference,
    sourceUrl: row.source_url,
    authenticity: row.authenticity,
    origin: row.origin,
  }));
}

export async function installBuiltinContent(entries: ContentRecord[]) {
  await initializeLocalDatabase();
  if (Platform.OS === "web") {
    const existing = await getContentEntries();
    if (existing.length === 0 && entries.length > 0) {
      await AsyncStorage.setItem(
        WEB_CONTENT_KEY,
        JSON.stringify(entries.map((entry) => ({ ...entry, origin: "builtin" }))),
      );
    }
    return;
  }
  const db = await getDatabase();
  const count = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM content_entries WHERE origin = 'builtin'",
  );
  if ((count?.count ?? 0) > 0 || entries.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const entry of entries) {
      await db.runAsync(
        `INSERT OR IGNORE INTO content_entries
          (id, category, title, body, repetition, source_name, source_reference, source_url, authenticity, origin)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'builtin')`,
        entry.id,
        entry.category,
        entry.title,
        entry.body,
        entry.repetition ?? null,
        entry.sourceName,
        entry.sourceReference,
        entry.sourceUrl,
        entry.authenticity ?? null,
      );
    }
  });
}

export async function applyPublishedContent(entries: ContentRecord[], version: string) {
  await initializeLocalDatabase();
  if (Platform.OS === "web") {
    const builtin = (await getContentEntries()).filter((entry) => entry.origin === "builtin");
    const published = entries.map((entry) => ({ ...entry, origin: "published" as const }));
    await AsyncStorage.setItem(WEB_CONTENT_KEY, JSON.stringify([...builtin, ...published]));
    await AsyncStorage.setItem("suly-content-version", version);
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM content_entries WHERE origin = 'published'");
    for (const entry of entries) {
      await db.runAsync(
        `INSERT INTO content_entries
          (id, category, title, body, repetition, source_name, source_reference, source_url, authenticity, origin)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
         ON CONFLICT(id) DO UPDATE SET
          category = excluded.category, title = excluded.title, body = excluded.body,
          repetition = excluded.repetition, source_name = excluded.source_name,
          source_reference = excluded.source_reference, source_url = excluded.source_url,
          authenticity = excluded.authenticity, origin = 'published', updated_at = CURRENT_TIMESTAMP`,
        entry.id,
        entry.category,
        entry.title,
        entry.body,
        entry.repetition ?? null,
        entry.sourceName,
        entry.sourceReference,
        entry.sourceUrl,
        entry.authenticity ?? null,
      );
    }
    await db.runAsync(
      `INSERT INTO content_meta (key, value) VALUES ('version', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      version,
    );
  });
}
