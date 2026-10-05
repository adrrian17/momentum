import { createDb } from "@momentum/db";
import {
  makeCaptureContext,
  makeResolveContext,
} from "alchemy/ActionRuntimeContext";
import { AlchemyContext } from "alchemy/AlchemyContext";
import { AuthProviders } from "alchemy/Auth/AuthProvider";
import { CredentialsStore } from "alchemy/Auth/Credentials";
import { SuppressMissingProviderConfig } from "alchemy/Auth/Profile";
import { withProfileOverride } from "alchemy/Auth/Resolve";
import {
  D1,
  CloudflareApiLive,
  CloudflareEnvironment,
} from "alchemy/Cloudflare";
import type { Output } from "alchemy/Output";
import { RuntimeContext, sanitizeKey } from "alchemy/RuntimeContext";
import { makeHttpStateStore, makeLocalState } from "alchemy/State";
import { PlatformServices } from "alchemy/Util/PlatformServices";
import {
  ConfigProvider,
  Effect,
  Layer,
  Logger,
  Redacted,
  Schema,
} from "effect";
import { layer as fetchHttpClientLayer } from "effect/http/FetchHttpClient";
import { z } from "zod";

const databaseState = z.object({
  status: z.enum(["created", "updated"]),
  resourceType: z.literal("Cloudflare.D1Database"),
  attr: z.object({
    databaseId: z.string().min(1),
    databaseName: z.string().min(1),
    accountId: z.string().min(1),
  }),
});

export interface BootstrapTarget {
  stage: string;
  remote: boolean;
  profile: string;
}

export function withBootstrapTarget<A>(
  target: BootstrapTarget,
  use: (name: string, database: ReturnType<typeof createDb>) => Promise<A>
): Promise<A> {
  const baseServices = Layer.mergeAll(
    PlatformServices,
    fetchHttpClientLayer,
    Logger.layer([]),
    ConfigProvider.layer(
      withProfileOverride(ConfigProvider.fromEnv(), target.profile)
    ),
    Layer.succeed(AuthProviders, {}),
    Layer.succeed(SuppressMissingProviderConfig, true),
    Layer.succeed(AlchemyContext, {
      dotAlchemy: `${process.cwd()}/.alchemy`,
      dev: !target.remote,
      adopt: false,
    })
  );

  const cloudServices = CloudflareApiLive().pipe(
    Layer.provideMerge(baseServices)
  );

  const services = target.remote
    ? cloudServices
    : Layer.succeed(
        CloudflareEnvironment,
        Effect.succeed({
          type: "apiToken",
          accountId: "00000000000000000000000000000000",
          apiToken: Redacted.make("local-unused"),
          source: { type: "env" },
        })
      ).pipe(Layer.provideMerge(cloudServices));

  const program = Effect.gen(function* resolveTarget() {
    const store = target.remote
      ? yield* Effect.gen(function* remoteStore() {
          const { accountId } = yield* yield* CloudflareEnvironment;

          // Read the existing cache directly so this command cannot provision a state store.
          const credentials = yield* (yield* CredentialsStore).read(
            target.profile,
            "cloudflare-state-store",
            Schema.Struct({
              url: Schema.String,
              authToken: Schema.String,
              accountId: Schema.String,
            })
          );

          if (!credentials || credentials.accountId !== accountId) {
            throw new Error(
              "Existing matching Alchemy state credentials required"
            );
          }

          return yield* makeHttpStateStore({
            ...credentials,
            id: "cloudflare-http",
          });
        })
      : yield* makeLocalState();

    const record = databaseState.parse(
      yield* store.get({
        stack: "momentum",
        stage: target.stage,
        fqn: "database",
      })
    );

    const { databaseId, databaseName, accountId } = record.attr;

    if (databaseId.startsWith("dev:") === target.remote) {
      throw new Error("Bootstrap target mode mismatch");
    }

    if (
      target.remote &&
      accountId !== (yield* yield* CloudflareEnvironment).accountId
    ) {
      throw new Error("Bootstrap target account mismatch");
    }

    const ref = yield* D1.Database.ref("database", {
      stack: "momentum",
      stage: target.stage,
    });

    const captures: Record<string, Output<unknown, never>> = {};

    const client = yield* D1.QueryDatabase(ref).pipe(
      Effect.provide(D1.QueryDatabaseLocal),
      Effect.provideService(RuntimeContext, makeCaptureContext(captures))
    );

    const capturedKey = sanitizeKey(ref.databaseId.toString());
    const capturedKeys = Object.keys(captures);

    if (capturedKeys.length !== 1 || capturedKeys[0] !== capturedKey) {
      throw new Error("Unsupported D1 capability capture");
    }

    // Bind the validated snapshot so a concurrent state update cannot redirect this operation.
    const resolved = { [capturedKey]: databaseId };

    const raw = yield* client.raw.pipe(
      Effect.provideService(RuntimeContext, makeResolveContext(resolved))
    );

    return yield* Effect.promise(() =>
      use(databaseName, createDb({ DB: raw }))
    );
  }).pipe(Effect.provide(services), Effect.scoped);

  return Effect.runPromise(program);
}
