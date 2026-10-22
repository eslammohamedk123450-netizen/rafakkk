import type { ContentRecord } from "@/lib/local-db";

const ALLOWED_CATEGORIES = new Set(["morning", "evening", "after_prayer", "sleep_wake", "istighfar", "salawat", "quran", "dua", "encouragement"]);
const MAX_ENTRIES = 2000;

export function isNewerPublishedVersion(candidate: string, current: string): boolean {
  if (!/^[1-9]\d{0,8}$/.test(candidate)) return false;
  if (/^builtin-\d+$/.test(current)) return true;
  if (!/^[1-9]\d{0,8}$/.test(current)) return false;
  return Number(candidate) > Number(current);
}

export function validateContentPack(input: unknown): { version: string; entries: ContentRecord[] } {
  if (!input || typeof input !== "object") throw new Error("صيغة حزمة التحديث غير صالحة.");
  const pack = input as { version?: unknown; entries?: unknown };
  if (typeof pack.version !== "string" || !/^[1-9]\d{0,8}$/.test(pack.version)) throw new Error("رقم إصدار الحزمة غير صالح.");
  if (!Array.isArray(pack.entries) || pack.entries.length > MAX_ENTRIES) throw new Error("قائمة المحتوى في الحزمة غير صالحة.");
  const ids = new Set<string>();
  const entries = pack.entries.map((raw, index): ContentRecord => {
    if (!raw || typeof raw !== "object") throw new Error(`المادة رقم ${index + 1} غير صالحة.`);
    const item = raw as Record<string, unknown>;
    const required = ["id", "category", "title", "body", "sourceName", "sourceReference", "sourceUrl"] as const;
    for (const key of required) if (typeof item[key] !== "string") throw new Error(`حقل ${key} غير صالح في المادة ${index + 1}.`);
    const id = item.id as string;
    const category = item.category as string;
    const title = item.title as string;
    const body = item.body as string;
    const sourceName = item.sourceName as string;
    const sourceReference = item.sourceReference as string;
    const sourceUrl = item.sourceUrl as string;
    const repetition = typeof item.repetition === "string" ? item.repetition : null;
    const authenticity = typeof item.authenticity === "string" ? item.authenticity : null;
    if (!/^[A-Za-z0-9._:-]{1,64}$/.test(id) || id.startsWith("builtin-")) throw new Error(`معرّف المادة ${index + 1} غير صالح أو محجوز.`);
    if (ids.has(id)) throw new Error(`يوجد معرّف مكرر في الحزمة: ${id}`);
    ids.add(id);
    if (!ALLOWED_CATEGORIES.has(category)) throw new Error(`تصنيف المادة ${index + 1} غير معروف.`);
    if (!title.trim() || title.length > 256 || !body.trim() || body.length > 12000 || (repetition?.length ?? 0) > 128) throw new Error(`طول العنوان أو النص غير مقبول في المادة ${index + 1}.`);
    if (category !== "encouragement") {
      let validUrl = false;
      try { const url = new URL(sourceUrl); validUrl = url.protocol === "https:" || url.protocol === "http:"; } catch { validUrl = false; }
      if (!sourceName.trim() || !sourceReference.trim() || !validUrl) throw new Error(`المادة الدينية ${index + 1} لا تحتوي على مصدر ومرجع ورابط صالح.`);
    }
    return { id, category, title, body, repetition, sourceName, sourceReference, sourceUrl, authenticity };
  });
  return { version: pack.version, entries };
}
