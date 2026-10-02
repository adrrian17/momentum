import type { Session } from "@momentum/auth";
import type { Database } from "@momentum/db";

export interface Context {
  session: Session | null;
  db: Database;
}
