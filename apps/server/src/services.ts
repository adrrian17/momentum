import { createAuth as createConfiguredAuth } from "@momentum/auth";
import { createDb } from "@momentum/db";
import type { Database } from "@momentum/db";
import { APIError } from "better-auth/api";

import { ENV } from "./env.server";

export function getDb(): Database {
  return createDb(ENV);
}

export async function createAuth(database?: Database) {
  return createConfiguredAuth(
    ENV,
    database ?? (await getDb()),
    async ({ user, url }) => {
      const verificationURL = new URL(url);
      verificationURL.searchParams.set(
        "callbackURL",
        new URL("/login", ENV.CORS_ORIGIN).href
      );

      try {
        await ENV.EMAIL.send({
          from: ENV.EMAIL_FROM,
          to: user.email,
          subject: "Verify your Momentum email",
          text: `Confirm your email to finish the Momentum registration you initiated:\n\n${verificationURL.href}\n\nThis link expires in one hour. Only confirm if you created this account and chose its password. If you did not request this, do not open the link.`,
        });
      } catch {
        throw new APIError("SERVICE_UNAVAILABLE", {
          code: "VERIFICATION_EMAIL_SEND_FAILED",
          message:
            "Could not send verification email. Try signing in to resend it.",
        });
      }
    }
  );
}
