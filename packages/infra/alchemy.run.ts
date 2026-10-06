import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Stage } from "alchemy/Stage";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import "varlock/auto-load";

import { resolveWebSettings } from "./src/web-settings";

const webSettings = Effect.gen(function* configuredWeb() {
  const rawOrigin = yield* Config.String("CORS_ORIGIN");
  const { dev } = yield* Alchemy.AlchemyContext;
  const stage = yield* Stage;

  return resolveWebSettings({ origin: rawOrigin, stage, dev });
}).pipe(Effect.orDie);

const publicOrigin = webSettings.pipe(
  Effect.map((settings) => settings.origin)
);

export const db = Cloudflare.D1.Database("database", {
  migrations: "../../packages/db/src/migrations",
});

export const server = Cloudflare.Worker("server", {
  main: "../../apps/server/src/index.ts",
  compatibility: {
    flags: ["nodejs_compat"],
  },
  // The server stays private; browsers reach it only through the web Worker's API binding.
  workersDev: false,
  env: {
    DB: db,
    CORS_ORIGIN: publicOrigin,
    BETTER_AUTH_SECRET: Config.Redacted("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: publicOrigin,
    EMAIL_FROM: Config.String("EMAIL_FROM"),
    EMAIL: Config.String("EMAIL_FROM").pipe(
      Effect.flatMap((from) =>
        Cloudflare.Email.SendEmail("EMAIL", {
          allowedSenderAddresses: [from],
        })
      )
    ),
  },
  dev: {
    port: 3000,
  },
});

export type ServerEnv = Cloudflare.InferEnv<typeof server>;

export const web = Cloudflare.Website.Vite(
  "web",
  Effect.gen(function* webProps() {
    const settings = yield* webSettings;

    return {
      name: settings.name,
      ...settings.exposure,
      rootDir: "../../apps/web",
      main: "src/worker.ts",
      assets: {
        htmlHandling: "auto-trailing-slash" as const,
        notFoundHandling: "single-page-application" as const,
        runWorkerFirst: ["/api", "/api/*"],
      },
      env: { API: server },
      dev: { port: settings.port },
    };
  })
);

export default Alchemy.Stack(
  "momentum",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* provisionWorkers() {
    const webWorker = yield* web;

    return {
      web: webWorker.url,
    };
  })
);
