import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "@momentum/api/routers/index";
import { initLogger } from "evlog";
import { createAuthMiddleware } from "evlog/better-auth";
import { evlog } from "evlog/hono";
import type { EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { createContext } from "./context";
import { ENV } from "./env.server";
import { createAuth } from "./services";

initLogger({
  env: { service: "momentum-server" },
});

const identifyUser = createAuthMiddleware(await createAuth(), {
  exclude: ["/api/auth/**"],
  maskEmail: true,
});

const app = new Hono<EvlogVariables>();

app.use(evlog());

app.use("*", async (c, next) => {
  await identifyUser(c.get("log"), c.req.raw.headers, c.req.path);

  return next();
});

app.use(
  "/*",
  cors({
    origin: ENV.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.on(["POST", "GET"], "/api/auth/*", async (c) => {
  const auth = await createAuth();

  return auth.handler(c.req.raw);
});

app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext: async (_opts, context) => ({
      ...(await createContext({ context })),
    }),
  })
);

app.get("/", (c) => c.text("OK"));

export default app;
