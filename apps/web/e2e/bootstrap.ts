import { spawn } from "node:child_process";
import { mkdir, rmdir } from "node:fs/promises";
import { setTimeout as pause } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { ENV } from "../src/env";

const infraDirectory = fileURLToPath(
  new URL("../../../packages/infra/", import.meta.url)
);

// oxlint-disable promise/avoid-new, sonarjs/no-os-command-from-path -- The harness runs the installed Bun CLI and bridges child-process callbacks.
function spawnBootstrap(
  args: string[],
  input?: { name: string; email: string; password: string }
) {
  return new Promise<{ status: number; output: string }>((resolve, reject) => {
    const child = spawn(
      "bun",
      [
        "run",
        "scripts/bootstrap.ts",
        "--stage",
        ENV.AUTH_TEST_STAGE,
        "--database",
        "database",
        ...args,
      ],
      {
        cwd: infraDirectory,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.resume();
    child.on("error", () =>
      reject(new Error("Private bootstrap command unavailable"))
    );
    child.on("close", (status) => resolve({ status: status ?? 1, output }));
    child.stdin.end(input ? JSON.stringify(input) : undefined);
  });
}

// Alchemy's per-database local gateway cannot be opened by concurrent test processes.
// oxlint-disable eslint/no-await-in-loop -- Lock acquisition must wait for the prior administrative process.
async function runBootstrap(
  args: string[],
  input?: { name: string; email: string; password: string }
) {
  const lock = `${infraDirectory}.alchemy/e2e-bootstrap-${ENV.AUTH_TEST_STAGE}.lock`;
  const deadline = Date.now() + 15_000;

  for (;;) {
    try {
      await mkdir(lock);
      break;
    } catch (error) {
      if (
        !(
          error instanceof Error &&
          "code" in error &&
          error.code === "EEXIST"
        ) ||
        Date.now() >= deadline
      ) {
        throw new Error("Private bootstrap test gateway unavailable", {
          cause: error,
        });
      }

      await pause(50);
    }
  }

  try {
    return await spawnBootstrap(args, input);
  } finally {
    await rmdir(lock);
  }
}
// oxlint-enable eslint/no-await-in-loop

export async function inspectBootstrap() {
  const result = await runBootstrap(["--inspect"]);

  if (result.status !== 0) {
    throw new Error(
      "Local bootstrap target unavailable; run the matching isolated stage"
    );
  }

  return z
    .object({
      confirmation: z.string(),
      userCount: z.number(),
      credentialCount: z.number(),
    })
    .parse(JSON.parse(result.output));
}

export async function bootstrapSyntheticAccount(
  email: string,
  password: string,
  confirmation: string
) {
  const result = await runBootstrap(
    [
      "--confirm",
      confirmation,
      "--auth-url",
      ENV.AUTH_TEST_BASE_URL,
      "--stdin",
    ],
    { name: "E2E User", email, password }
  );

  return result.status;
}
