import { defineRelations } from "drizzle-orm";

import {
  account,
  authRelations,
  session,
  user,
  verification,
} from "./schema/auth";
import { note, notesRelations, noteTag } from "./schema/notes";

export const relations = {
  ...defineRelations({ account, note, noteTag, session, user, verification }),
  ...authRelations,
  ...notesRelations,
};
