import { defineRelationsPart, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export const note = sqliteTable(
  "note",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("note_userId_updatedAt_id_idx").on(
      table.userId,
      table.updatedAt,
      table.id
    ),
  ]
);

export const noteTag = sqliteTable(
  "note_tag",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => note.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.noteId, table.tag] }),
    index("note_tag_tag_idx").on(table.tag),
  ]
);

// No `user` key: spreading parts replaces whole table entries, so a `user.notes` here would drop authRelations' `user` relations.
export const notesRelations = defineRelationsPart({ note, noteTag }, (r) => ({
  note: {
    tags: r.many.noteTag({
      from: r.note.id,
      to: r.noteTag.noteId,
    }),
  },
  noteTag: {
    note: r.one.note({
      from: r.noteTag.noteId,
      to: r.note.id,
    }),
  },
}));
