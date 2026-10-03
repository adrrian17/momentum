import { readdirSync } from "node:fs";
import path from "node:path";

import { defineConfig } from "drizzle-kit";

// alchemy dev keeps each local D1 database as a Durable Object SQLite file here.
const localD1Dir = path.resolve(
  "../infra/.alchemy/local/d1/cloudflare-runtime-D1DatabaseObject"
);

function findLocalD1File() {
  let files: string[] = [];

  try {
    files = readdirSync(localD1Dir).filter(
      (file) => file.endsWith(".sqlite") && file !== "metadata.sqlite"
    );
  } catch {
    // A missing directory means alchemy dev has not run yet; reported below.
  }

  if (files.length !== 1) {
    throw new Error(
      `Expected exactly one local D1 database in ${localD1Dir}, found ${files.length}. Run \`pnpm run dev\` once to create it.`
    );
  }

  return path.join(localD1Dir, ...files);
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "sqlite",
  dbCredentials: { url: `file:${findLocalD1File()}` },
  // Keep the simulator and Alchemy bookkeeping tables out of the diff so push never drops them.
  tablesFilter: ["!_cf_*", "!__alchemy_*"],
});
