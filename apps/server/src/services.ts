import { createAuth as createConfiguredAuth } from "@momentum/auth";
import { createDb } from "@momentum/db";
import type { Database } from "@momentum/db";

import { ENV } from "./env.server";

export function getDb(): Database {
  return createDb(ENV);
}

export async function createAuth(database?: Database) {
  return createConfiguredAuth(ENV, database ?? (await getDb()));
}
