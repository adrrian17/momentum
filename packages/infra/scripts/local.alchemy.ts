import { Stack } from "alchemy";
import { Website, providers } from "alchemy/Cloudflare";
import { localState } from "alchemy/State";
import { Config, Effect } from "effect";

import { server } from "../alchemy.run";

export default Stack(
  "momentum",
  { providers: providers(), state: localState() },
  Effect.gen(function* localStack() {
    const webOrigin = new URL(
      yield* Config.String("AUTH_TEST_BASE_URL").pipe(
        Config.withDefault("http://localhost:3001")
      )
    );

    const serverWorker = yield* server;

    const webWorker = yield* Website.Vite("web", {
      rootDir: "../../apps/web",
      assets: {
        htmlHandling: "auto-trailing-slash",
        notFoundHandling: "single-page-application",
      },
      env: { VITE_SERVER_URL: serverWorker.url.as<string>() },
      dev: { port: Number(webOrigin.port) },
    });

    return { web: webWorker.url, server: serverWorker.url };
  })
);
