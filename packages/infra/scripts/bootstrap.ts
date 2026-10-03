import { parseArgs } from "node:util";

import {
  bootstrapAccount,
  bootstrapIdentity,
  inspectBootstrapDatabase,
} from "@momentum/auth/bootstrap";
import { z } from "zod";

import { withBootstrapTarget } from "./bootstrap-target";

const REFUSED = "Bootstrap refused";

async function hiddenInput(label: string) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Use a terminal or explicit --stdin input");
  }

  process.stdout.write(`${label}: `);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  try {
    // oxlint-disable-next-line promise/avoid-new -- Terminal input uses event callbacks.
    return await new Promise<string>((resolve, reject) => {
      let value = "";

      function onData(chunk: Buffer) {
        for (const character of chunk.toString()) {
          if (character === "\u0003" || character === "\u0004") {
            process.stdin.off("data", onData);
            reject(new Error("Bootstrap cancelled"));

            return;
          }

          if (character === "\r" || character === "\n") {
            process.stdin.off("data", onData);
            resolve(value);

            return;
          }

          if (character === "\u007F" || character === "\b") {
            value = value.slice(0, -1);
          } else if (character >= " ") {
            value += character;
          }
        }
      }

      process.stdin.on("data", onData);
    });
  } finally {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write("\n");
  }
}

// oxlint-disable react-doctor/server-sequential-independent-await, react-doctor/async-parallel -- Prompts share one terminal and must run sequentially.
async function identityFromInput(stdin: boolean) {
  if (stdin) {
    if (process.stdin.isTTY) {
      throw new Error("--stdin requires a pipe");
    }

    let input = "";

    for await (const chunk of process.stdin) {
      input += chunk.toString();

      if (input.length > 4096) {
        throw new Error(REFUSED);
      }
    }

    return bootstrapIdentity.parse(JSON.parse(input));
  }

  const name = await hiddenInput("Name (hidden)");
  const email = await hiddenInput("Email (hidden)");
  const password = await hiddenInput("Password (hidden)");
  const confirmation = await hiddenInput("Confirm password (hidden)");

  if (password !== confirmation) {
    throw new Error(REFUSED);
  }

  return bootstrapIdentity.parse({ name, email, password });
}

async function main() {
  const { values } = parseArgs({
    options: {
      stage: { type: "string" },
      database: { type: "string" },
      confirm: { type: "string" },
      profile: { type: "string", default: "default" },
      remote: { type: "boolean", default: false },
      stdin: { type: "boolean", default: false },
      "auth-url": { type: "string" },
      inspect: { type: "boolean", default: false },
    },
  });

  const stage = z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/u)
    .parse(values.stage);

  if (
    values.database !== "database" ||
    (!values.remote && stage === "production")
  ) {
    throw new Error(REFUSED);
  }

  const target = { stage, remote: values.remote, profile: values.profile };
  await withBootstrapTarget(target, async (name, database) => {
    const confirmation = `${target.remote ? "remote" : "local"}:momentum/${stage}/${name}`;

    if (values.inspect) {
      const counts = await inspectBootstrapDatabase(database);
      process.stdout.write(`${JSON.stringify({ confirmation, ...counts })}\n`);

      return;
    }

    if (values.confirm !== confirmation) {
      throw new Error(REFUSED);
    }

    const authURL = new URL(z.url().parse(values["auth-url"]));

    if (
      target.remote
        ? authURL.protocol !== "https:"
        : authURL.protocol !== "http:" ||
          authURL.hostname !== "localhost" ||
          authURL.port !== "3000"
    ) {
      throw new Error(REFUSED);
    }

    const identity = await identityFromInput(values.stdin);
    await bootstrapAccount(database, identity);

    try {
      const response = await fetch(
        new URL("/api/auth/send-verification-email", authURL),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: identity.email.toLowerCase() }),
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
        }
      );

      if (!response.ok) {
        throw new Error("Verification request failed");
      }

      process.stdout.write(
        "Account created. Verification requested; confirm before signing in.\n"
      );
    } catch {
      process.stderr.write(
        "Account created. Verification request failed; sign in to resend.\n"
      );
      process.exitCode = 2;
    }
  });
}

try {
  await main();
} catch {
  process.stderr.write(
    "Bootstrap refused. Check the explicit target, confirmation, input and empty database prerequisite. No existing account is replaced.\n"
  );
  process.exitCode = 1;
}

process.exit(process.exitCode ?? 0);
