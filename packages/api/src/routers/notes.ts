import { note, noteTag } from "@momentum/db/schema/notes";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { extractTags } from "../tags";

const PAGE_SIZE = 50;

const noteId = z.string().min(1);

const content = z.string().trim().min(1).max(100_000);

// The single place tags are normalized; `Deploy` and `deploy` are the same tag.
const tag = z.string().trim().toLowerCase().min(1).max(50);

const tags = z
  .array(tag)
  .transform((values) => [...new Set(values)])
  .pipe(z.array(z.string()).max(20));

// A note's tags are its inline `#tag`s plus the ones attached without touching the text.
const noteBody = z
  .object({ content, tags: z.array(z.string()).default([]) })
  .transform((body) => ({
    content: body.content,
    tags: [...extractTags(body.content), ...body.tags],
  }))
  .pipe(z.object({ content: z.string(), tags }));

const cursor = z.object({ updatedAt: z.number().int(), id: noteId });

const noteWithTags = {
  with: { tags: { columns: { tag: true }, orderBy: { tag: "asc" } } },
} as const;

interface NoteRow {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags: { tag: string }[];
}

function toNote(row: NoteRow) {
  return {
    id: row.id,
    content: row.content,
    tags: row.tags.map((entry) => entry.tag),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function notFound() {
  return new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
}

export const notesRouter = router({
  list: protectedProcedure
    .input(z.object({ tag: tag.optional(), cursor: cursor.nullish() }))
    .query(async ({ ctx, input }) => {
      const after = input.cursor;

      const rows = await ctx.db.query.note.findMany({
        ...noteWithTags,
        where: {
          userId: ctx.session.user.id,
          tags: input.tag ? { tag: input.tag } : undefined,
          OR: after
            ? [
                { updatedAt: { lt: new Date(after.updatedAt) } },
                {
                  updatedAt: { eq: new Date(after.updatedAt) },
                  id: { lt: after.id },
                },
              ]
            : undefined,
        },
        orderBy: { updatedAt: "desc", id: "desc" },
        limit: PAGE_SIZE + 1,
      });

      const page = rows.slice(0, PAGE_SIZE);
      const last = page.at(-1);

      const nextCursor =
        rows.length > PAGE_SIZE && last
          ? { updatedAt: last.updatedAt.getTime(), id: last.id }
          : null;

      return { items: page.map(toNote), nextCursor };
    }),

  tags: protectedProcedure.query(({ ctx }) => {
    const uses = count();

    return ctx.db
      .select({ tag: noteTag.tag, count: uses })
      .from(noteTag)
      .innerJoin(note, eq(note.id, noteTag.noteId))
      .where(eq(note.userId, ctx.session.user.id))
      .groupBy(noteTag.tag)
      .orderBy(desc(uses), asc(noteTag.tag));
  }),

  get: protectedProcedure
    .input(z.object({ id: noteId }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.query.note.findFirst({
        ...noteWithTags,
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!row) {
        throw notFound();
      }

      return toNote(row);
    }),

  create: protectedProcedure
    .input(noteBody)
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const tagRows = input.tags.map((value) => ({ noteId: id, tag: value }));

      await ctx.db.batch([
        ctx.db
          .insert(note)
          .values({ id, userId: ctx.session.user.id, content: input.content }),
        ...(tagRows.length > 0 ? [ctx.db.insert(noteTag).values(tagRows)] : []),
      ]);

      return { id };
    }),

  update: protectedProcedure
    .input(z.object({ id: noteId }).and(noteBody))
    .mutation(async ({ ctx, input }) => {
      const owned = and(
        eq(note.id, input.id),
        eq(note.userId, ctx.session.user.id)
      );

      const [existing] = await ctx.db
        .select({ id: note.id })
        .from(note)
        .where(owned);

      if (!existing) {
        throw notFound();
      }

      const tagRows = input.tags.map((value) => ({
        noteId: input.id,
        tag: value,
      }));

      // A D1 batch runs as one transaction, so the tag replacement is atomic; drizzle's transaction() issues BEGIN, which D1 rejects.
      await ctx.db.batch([
        ctx.db
          .update(note)
          .set({ content: input.content, updatedAt: new Date() })
          .where(owned),
        ctx.db.delete(noteTag).where(eq(noteTag.noteId, input.id)),
        ...(tagRows.length > 0 ? [ctx.db.insert(noteTag).values(tagRows)] : []),
      ]);
    }),

  delete: protectedProcedure
    .input(z.object({ id: noteId }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db
        .delete(note)
        .where(and(eq(note.id, input.id), eq(note.userId, ctx.session.user.id)))
        .returning({ id: note.id });

      if (deleted.length === 0) {
        throw notFound();
      }
    }),
});
