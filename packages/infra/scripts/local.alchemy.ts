import { Stack } from "alchemy";
import { providers } from "alchemy/Cloudflare";
import { localState } from "alchemy/State";
import { Effect } from "effect";

import { web } from "../alchemy.run";

export default Stack(
  "momentum",
  { providers: providers(), state: localState() },
  Effect.gen(function* localStack() {
    const webWorker = yield* web;

    return { web: webWorker.url };
  })
);
