import {
  getSessionCookieName,
  getSessionCookieOptions,
} from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  archiveContentDraft,
  getPublishedContentPack,
  listAdminContent,
  markContentReviewed,
  publishReviewedContent,
  saveContentDraft,
} from "./content-db";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(getSessionCookieName(ctx.req), {
        ...cookieOptions,
        maxAge: -1,
      });
      return {
        success: true,
      } as const;
    }),
  }),
  content: router({
    latestPack: publicProcedure.query(() => getPublishedContentPack()),
    adminList: adminProcedure.query(async () => {
      try {
        return await listAdminContent();
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "تعذر تحميل المحتوى.");
      }
    }),
    saveDraft: adminProcedure
      .input(z.object({
        id: z.string().max(64).optional(),
        category: z.enum(["morning", "evening", "after_prayer", "sleep_wake", "istighfar", "salawat", "quran", "dua", "encouragement"]),
        title: z.string().min(1).max(256),
        body: z.string().min(1).max(12000),
        repetition: z.string().max(128).optional().default(""),
        sourceName: z.string().max(256).optional().default(""),
        sourceReference: z.string().max(512).optional().default(""),
        sourceUrl: z.string().max(2048).optional().default(""),
        authenticity: z.string().max(256).optional().default(""),
      }))
      .mutation(({ input }) => saveContentDraft({ ...input, id: input.id ?? randomUUID() })),
    markReviewed: adminProcedure
      .input(z.object({ id: z.string().min(1).max(64) }))
      .mutation(({ input }) => markContentReviewed(input.id)),
    archive: adminProcedure
      .input(z.object({ id: z.string().min(1).max(64) }))
      .mutation(({ input }) => archiveContentDraft(input.id)),
    publish: adminProcedure
      .input(z.object({ message: z.string().max(256).optional().default("") }))
      .mutation(({ ctx, input }) => publishReviewedContent(ctx.user.openId, input.message)),
  }),
});

export type AppRouter = typeof appRouter;
