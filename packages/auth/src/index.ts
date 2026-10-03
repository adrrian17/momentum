import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@momentum/db";
import * as schema from "@momentum/db/schema/auth";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { z } from "zod";

export interface AuthConfig {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
  // The only email allowed to sign up; unset or empty closes sign-up.
  SIGNUP_EMAIL?: string;
}

export function createAuth(
  env: AuthConfig,
  database: Database,
  sendVerificationEmail: (data: {
    user: { email: string };
    url: string;
  }) => Promise<void>,
  desktopOrigins: readonly string[] = []
) {
  // The deployed web and API Workers are different sites, so the cookie must be SameSite=None; Secure.
  // Local dev serves plain http, where WebKit drops Secure cookies; localhost ports are same-site, so Lax works there.
  const crossSiteCookie = env.BETTER_AUTH_URL.startsWith("https://");

  return betterAuth({
    database: drizzleAdapter(database, {
      provider: "sqlite",
      schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
    emailAndPassword: { enabled: true, requireEmailVerification: true },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail,
    },
    logger: { disabled: true },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: crossSiteCookie ? "none" : "lax",
        secure: crossSiteCookie,
        httpOnly: true,
      },
    },
    hooks: {
      // oxlint-disable-next-line require-await -- Better Auth middleware handlers must return a Promise.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") {
          return;
        }

        const allowed = env.SIGNUP_EMAIL?.toLowerCase();
        const email = z.email().safeParse(ctx.body?.email);

        if (
          !allowed ||
          !email.success ||
          email.data.toLowerCase() !== allowed
        ) {
          throw new APIError("FORBIDDEN", { message: "Sign-up is closed" });
        }
      }),
    },
    plugins: [],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
