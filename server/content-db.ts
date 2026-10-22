import { desc, eq } from "drizzle-orm";
import { contentItems, contentReleases, publishedContent } from "../drizzle/schema";
import { getDb } from "./db";

export type ContentDraftInput = {
  id: string;
  category: string;
  title: string;
  body: string;
  repetition?: string;
  sourceName: string;
  sourceReference: string;
  sourceUrl: string;
  authenticity: string;
};

function hasValidSource(item: Pick<ContentDraftInput, "category" | "sourceName" | "sourceReference" | "sourceUrl">) {
  if (item.category === "encouragement") return true;
  if (!item.sourceName.trim() || !item.sourceReference.trim()) return false;
  try {
    const url = new URL(item.sourceUrl);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function getPublishedContentPack() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا؛ بقي المحتوى المحلي دون تغيير.");
  const [release] = await db.select().from(contentReleases).orderBy(desc(contentReleases.version)).limit(1);
  if (!release) return null;
  const entries = await db.select().from(publishedContent);
  return { version: `${release.version}`, entries };
}

export async function listAdminContent() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  return db.select().from(contentItems).orderBy(desc(contentItems.updatedAt));
}

export async function saveContentDraft(input: ContentDraftInput) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  await db.insert(contentItems).values({
    ...input,
    repetition: input.repetition || null,
    reviewStatus: "pending",
    isArchived: 0,
  }).onDuplicateKeyUpdate({
    set: {
      category: input.category,
      title: input.title,
      body: input.body,
      repetition: input.repetition || null,
      sourceName: input.sourceName,
      sourceReference: input.sourceReference,
      sourceUrl: input.sourceUrl,
      authenticity: input.authenticity,
      reviewStatus: "pending",
      isArchived: 0,
      updatedAt: new Date(),
    },
  });
  return { id: input.id, reviewStatus: "pending" as const };
}

export async function markContentReviewed(id: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const [item] = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1);
  if (!item) throw new Error("لم يُعثر على المحتوى.");
  if (!hasValidSource(item)) throw new Error("لا يمكن اعتماد هذا النص قبل إضافة المصدر والمرجع والرابط.");
  await db.update(contentItems).set({ reviewStatus: "reviewed", updatedAt: new Date() }).where(eq(contentItems.id, id));
  return { id, reviewStatus: "reviewed" as const };
}

export async function archiveContentDraft(id: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  await db.update(contentItems).set({ isArchived: 1, reviewStatus: "reviewed", updatedAt: new Date() }).where(eq(contentItems.id, id));
  return { id, archived: true };
}

export async function publishReviewedContent(publishedBy: string, message = "") {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  return db.transaction(async (tx) => {
    const drafts = await tx.select().from(contentItems);
    const approved = drafts.filter((item) => item.reviewStatus === "reviewed" && item.isArchived === 0);
    const archived = drafts.filter((item) => item.isArchived === 1);
    if (!approved.length && !archived.length) throw new Error("لا توجد مواد مراجعة للنشر.");
    const invalid = approved.find((item) => !hasValidSource(item));
    if (invalid) throw new Error(`أضف مصدرًا موثوقًا قبل نشر: ${invalid.title}`);

    const [latest] = await tx.select().from(contentReleases).orderBy(desc(contentReleases.version)).limit(1);
    const version = (latest?.version ?? 0) + 1;
    const currentlyPublished = await tx.select({ id: publishedContent.id }).from(publishedContent);
    const archivedIds = new Set(archived.map((item) => item.id));
    const publishedIds = new Set([
      ...currentlyPublished.map((item) => item.id).filter((id) => !archivedIds.has(id)),
      ...approved.map((item) => item.id),
    ]);
    const publishedCount = publishedIds.size;
    await tx.insert(contentReleases).values({ version, message, entryCount: publishedCount, publishedBy });

    for (const item of approved) {
      await tx.insert(publishedContent).values({
        id: item.id,
        versionId: version,
        category: item.category,
        title: item.title,
        body: item.body,
        repetition: item.repetition,
        sourceName: item.sourceName,
        sourceReference: item.sourceReference,
        sourceUrl: item.sourceUrl,
        authenticity: item.authenticity,
      }).onDuplicateKeyUpdate({
        set: {
          versionId: version,
          category: item.category,
          title: item.title,
          body: item.body,
          repetition: item.repetition,
          sourceName: item.sourceName,
          sourceReference: item.sourceReference,
          sourceUrl: item.sourceUrl,
          authenticity: item.authenticity,
          updatedAt: new Date(),
        },
      });
    }
    for (const item of archived) {
      await tx.delete(publishedContent).where(eq(publishedContent.id, item.id));
    }
    return { version: `${version}`, entryCount: publishedCount };
  });
}
