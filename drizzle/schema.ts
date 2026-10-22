import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Editable administration workspace; never sent to end users until published. */
export const contentItems = mysqlTable("content_items", {
  id: varchar("id", { length: 64 }).primaryKey(),
  category: varchar("category", { length: 48 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  body: text("body").notNull(),
  repetition: varchar("repetition", { length: 128 }),
  sourceName: varchar("sourceName", { length: 256 }).notNull().default(""),
  sourceReference: varchar("sourceReference", { length: 512 }).notNull().default(""),
  sourceUrl: varchar("sourceUrl", { length: 2048 }).notNull().default(""),
  authenticity: varchar("authenticity", { length: 256 }).notNull().default(""),
  reviewStatus: mysqlEnum("reviewStatus", ["pending", "reviewed"]).default("pending").notNull(),
  isArchived: int("isArchived").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Monotonic publish versions for the optional client-side content update. */
export const contentReleases = mysqlTable("content_releases", {
  version: int("version").primaryKey(),
  message: varchar("message", { length: 256 }).notNull().default(""),
  entryCount: int("entryCount").notNull().default(0),
  publishedBy: varchar("publishedBy", { length: 64 }).notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
});

/** Current public snapshot. Draft edits never change this table until a publish action. */
export const publishedContent = mysqlTable("published_content", {
  id: varchar("id", { length: 64 }).primaryKey(),
  versionId: int("versionId").notNull(),
  category: varchar("category", { length: 48 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  body: text("body").notNull(),
  repetition: varchar("repetition", { length: 128 }),
  sourceName: varchar("sourceName", { length: 256 }).notNull().default(""),
  sourceReference: varchar("sourceReference", { length: 512 }).notNull().default(""),
  sourceUrl: varchar("sourceUrl", { length: 2048 }).notNull().default(""),
  authenticity: varchar("authenticity", { length: 256 }).notNull().default(""),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
