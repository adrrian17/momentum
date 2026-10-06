import { randomUUID } from "node:crypto";

import type { Database } from "@momentum/db";
import { account, user } from "@momentum/db/schema/auth";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { getTableColumns, sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-orm/zod";
import { z } from "zod";

interface GeneratedAuthRecords {
  [model: string]: unknown[];
  user: unknown[];
  account: unknown[];
  session: unknown[];
}

export const bootstrapIdentity = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email(),
  password: z.string().min(8).max(128),
});

function recordSelection(
  table: SQLiteTable,
  record: typeof user.$inferInsert | typeof account.$inferInsert
) {
  const recordValues = new Map(Object.entries(record));

  const values = Object.entries(getTableColumns(table)).map(
    ([key, column]) => sql`${sql.param(recordValues.get(key) ?? null, column)}`
  );

  const selectedValues = sql.join(values, sql`, `);

  return sql`select ${selectedValues}`;
}

// This module is imported only by the operator CLI, never by the public server.
export async function bootstrapAccount(
  database: Database,
  input: z.infer<typeof bootstrapIdentity>
) {
  const identity = bootstrapIdentity.parse(input);

  const memory: GeneratedAuthRecords = {
    user: [],
    account: [],
    session: [],
  };

  const privateAuth = betterAuth({
    database: memoryAdapter(memory),
    secret: randomUUID() + randomUUID(),
    baseURL: "http://localhost",
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      requireEmailVerification: true,
    },
    emailVerification: { sendOnSignUp: false },
    // Better Auth logs can include the bootstrap email.
    logger: { disabled: true },
  });

  await privateAuth.api.signUpEmail({ body: identity });
  const newUser = createInsertSchema(user).parse(memory.user[0]);
  const credential = createInsertSchema(account).parse(memory.account[0]);

  const valid = [
    memory.user.length === 1,
    memory.account.length === 1,
    memory.session.length === 0,
    newUser.emailVerified === false,
    credential.providerId === "credential",
    credential.userId === newUser.id,
    credential.accountId === newUser.id,
    Boolean(credential.password),
    credential.password !== identity.password,
  ];

  if (!valid.every(Boolean)) {
    throw new Error("Bootstrap refused");
  }

  // D1 batches are atomic. Only the first batch on an empty target can insert.
  const results = await database.batch([
    database
      .insert(user)
      .select(
        sql`${recordSelection(user, newUser)} where not exists (select 1 from ${user})`
      ),
    database
      .insert(account)
      .select(
        sql`${recordSelection(account, credential)} where exists (select 1 from ${user} where ${user.id} = ${newUser.id})`
      ),
  ]);

  if (results.some((result) => result.meta.changes !== 1)) {
    throw new Error("Bootstrap refused");
  }
}

export function inspectBootstrapDatabase(database: Database) {
  return database
    .select({
      userCount: sql<number>`(select count(*) from ${user})`,
      credentialCount: sql<number>`(select count(*) from ${account})`,
    })
    .from(sql`(select 1)`)
    .get();
}
