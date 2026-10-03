// oxlint-disable sonarjs/no-hardcoded-passwords, react-doctor/server-sequential-independent-await -- This isolated synthetic D1 probe uses a fixture password and sequential reads to compare mutations.
// oxlint-disable promise/avoid-new, sonarjs/no-os-command-from-path -- Run two real Bun processes against an isolated D1.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { parseArgs } from "node:util";

import {
  bootstrapAccount,
  inspectBootstrapDatabase,
} from "@momentum/auth/bootstrap";
import { account, user } from "@momentum/db/schema/auth";
import { z } from "zod";

import { withBootstrapTarget } from "./bootstrap-target";

const { values } = parseArgs({
  options: {
    stage: { type: "string" },
    child: { type: "boolean" },
    candidate: { type: "string" },
  },
});

const stage = z
  .string()
  .regex(/^e2e-bootstrap-probe-[a-zA-Z0-9_-]+$/u)
  .parse(values.stage);

const target = { stage, remote: false, profile: "default" };

const identity = {
  name: "Synthetic bootstrap probe",
  email: `${values.candidate ?? "rollback"}@example.com`,
  password: "synthetic-probe-123",
};

async function candidateProcess(candidate: string) {
  const child = spawn(
    "bun",
    [
      "run",
      "scripts/verify-bootstrap.ts",
      "--stage",
      stage,
      "--child",
      "--candidate",
      candidate,
    ],
    { stdio: ["ignore", "ignore", "ignore"] }
  );

  const [status] = await once(child, "close");

  return status;
}

async function verify() {
  await withBootstrapTarget(target, async (_name, database) => {
    const emptyCounts = await inspectBootstrapDatabase(database);
    assert.equal(
      emptyCounts?.userCount,
      0,
      "Probe requires a fresh empty local D1"
    );
    await database.$client.exec(
      "CREATE TRIGGER bootstrap_probe_reject BEFORE INSERT ON account BEGIN SELECT RAISE(ABORT, 'synthetic probe rejection'); END"
    );

    try {
      await assert.rejects(() => bootstrapAccount(database, identity));
      const counts = await inspectBootstrapDatabase(database);
      assert.equal(
        counts?.userCount,
        0,
        "Failed credential insert rolled back user"
      );
      assert.equal(
        counts?.credentialCount,
        0,
        "Failed batch saved no credential"
      );
    } finally {
      await database.$client.exec("DROP TRIGGER bootstrap_probe_reject");
    }
  });

  const results = await Promise.all([
    candidateProcess("race-a"),
    candidateProcess("race-b"),
  ]);

  assert.equal(
    results.filter((status) => status === 0).length,
    1,
    "Exactly one process creates an account"
  );
  assert.equal(
    results.filter((status) => status === 1).length,
    1,
    "Other process refuses"
  );
  await withBootstrapTarget(target, async (_name, database) => {
    const counts = await inspectBootstrapDatabase(database);
    assert.equal(
      counts?.userCount,
      1,
      "Race created one user across distinct emails"
    );
    assert.equal(counts?.credentialCount, 1, "Race created one credential");
    const beforeUsers = await database.select().from(user);
    const beforeAccounts = await database.select().from(account);
    await assert.rejects(() => bootstrapAccount(database, identity));
    const afterUsers = await database.select().from(user);
    const afterAccounts = await database.select().from(account);
    assert.ok(
      JSON.stringify(beforeUsers) === JSON.stringify(afterUsers),
      "Refusal preserved user data"
    );
    assert.ok(
      JSON.stringify(beforeAccounts) === JSON.stringify(afterAccounts),
      "Refusal preserved credential data"
    );
    assert.ok(
      afterUsers.every((record) => !record.emailVerified),
      "Bootstrap did not verify an account"
    );
  });
  process.stdout.write(
    "Local D1 passed rollback, cross-process race, repeat refusal and record preservation checks.\n"
  );
}

try {
  // oxlint-disable-next-line unicorn/prefer-ternary -- Child and parent modes have distinct operations.
  if (values.child) {
    await withBootstrapTarget(target, async (_name, database) => {
      await bootstrapAccount(database, identity);
    });
  } else {
    await verify();
  }
} catch {
  if (!values.child) {
    process.stderr.write(
      "Bootstrap probe failed. Preserve the stage for inspection.\n"
    );
  }

  process.exitCode = 1;
}

process.exit(process.exitCode ?? 0);
