import assert from "node:assert/strict";

import { resolveWebSettings } from "../src/web-settings";

const workersDev = { enabled: true, previewsEnabled: false } as const;

const productionStage = "production";

const productionOrigin = "https://momentum.adrianayala.mx";

const temporaryOrigin = "https://next.momentum.adrianayala.mx";

const smokeOrigin = "https://momentum-smoke-web.account.workers.dev";

const productionWorkersOrigin =
  "https://momentum-production-web.account.workers.dev";

const localProtocol = "http:";

const localOrigin = `${localProtocol}//localhost:3001`;

const cases = [
  {
    input: {
      origin: localOrigin,
      stage: "e2e-bootstrap",
      dev: true,
    },
    expected: {
      name: "momentum-e2e-bootstrap-web",
      origin: localOrigin,
      port: 3001,
      exposure: { domain: null, workersDev },
    },
  },
  {
    input: {
      origin: smokeOrigin,
      stage: "smoke",
      dev: false,
    },
    expected: {
      name: "momentum-smoke-web",
      origin: smokeOrigin,
      port: 80,
      exposure: { domain: null, workersDev },
    },
  },
  {
    input: {
      origin: productionWorkersOrigin,
      stage: productionStage,
      dev: false,
    },
    expected: {
      name: "momentum-production-web",
      origin: productionWorkersOrigin,
      port: 80,
      exposure: { domain: null, workersDev },
    },
  },
  ...["momentum.adrianayala.mx", "next.momentum.adrianayala.mx"].map(
    (host) => ({
      input: { origin: `https://${host}`, stage: productionStage, dev: false },
      expected: {
        name: "momentum-production-web",
        origin: `https://${host}`,
        port: 80,
        exposure: {
          domain: { name: host, zoneName: "adrianayala.mx", previews: false },
          workersDev: false,
        },
      },
    })
  ),
];

for (const { input, expected } of cases) {
  assert.deepEqual(resolveWebSettings(input), expected);
}

const acceptedTrailingSlash = resolveWebSettings({
  origin: `${productionOrigin}/`,
  stage: productionStage,
  dev: false,
});

assert.equal(acceptedTrailingSlash.origin, productionOrigin);

const localVariants = ["127.0.0.1", "[::1]"].map((hostname) =>
  resolveWebSettings({
    origin: `${localProtocol}//${hostname}:3001`,
    stage: "e2e-bootstrap",
    dev: true,
  })
);

assert.deepEqual(
  localVariants.map(({ port }) => port),
  [3001, 3001]
);

const invalid = [
  { origin: `${localProtocol}//example.com`, stage: "local", dev: true },
  { origin: "https://localhost:3001", stage: "local", dev: true },
  { origin: `${localOrigin}/path`, stage: "local", dev: true },
  { origin: `${localOrigin}?query`, stage: "local", dev: true },
  { origin: `${localOrigin}?`, stage: "local", dev: true },
  { origin: `${localOrigin}#`, stage: "local", dev: true },
  {
    origin: `${localProtocol}//user@localhost:3001`,
    stage: "local",
    dev: true,
  },
  {
    origin: smokeOrigin,
    stage: "other",
    dev: false,
  },
  {
    origin: `${localProtocol}//momentum-smoke-web.account.workers.dev`,
    stage: "smoke",
    dev: false,
  },
  {
    origin: "https://wrong-smoke-web.account.workers.dev",
    stage: "smoke",
    dev: false,
  },
  {
    origin: "https://momentum-smoke-web.account.extra.workers.dev",
    stage: "smoke",
    dev: false,
  },
  {
    origin: "https://momentum-smoke-web.account.workers.dev:443",
    stage: "smoke",
    dev: false,
  },
  { origin: productionOrigin, stage: "smoke", dev: false },
  {
    origin: "https://other.adrianayala.mx",
    stage: productionStage,
    dev: false,
  },
  {
    origin: `${productionOrigin}/path`,
    stage: productionStage,
    dev: false,
  },
  {
    origin: `${productionOrigin}?query`,
    stage: productionStage,
    dev: false,
  },
  {
    origin: "https://user@momentum.adrianayala.mx",
    stage: productionStage,
    dev: false,
  },
  {
    origin: "https://momentum.adrianayala.mx:443",
    stage: productionStage,
    dev: false,
  },
  {
    origin: "https://momentum.adrianayala.mx.",
    stage: productionStage,
    dev: false,
  },
  {
    origin: " https://momentum.adrianayala.mx",
    stage: productionStage,
    dev: false,
  },
  {
    origin: `${productionOrigin}#fragment`,
    stage: productionStage,
    dev: false,
  },
  { origin: "https://constructor", stage: productionStage, dev: false },
  { origin: "https://toString", stage: productionStage, dev: false },
  {
    origin: temporaryOrigin,
    stage: "smoke",
    dev: false,
  },
  {
    origin: temporaryOrigin,
    stage: productionStage,
    dev: true,
  },
  { origin: `${localProtocol}//127.0.0.1:3001`, stage: "local", dev: false },
  { origin: localOrigin, stage: "bad stage", dev: true },
  {
    origin: productionWorkersOrigin,
    stage: "PRODUCTION",
    dev: false,
  },
];

for (const input of invalid) {
  assert.throws(() => resolveWebSettings(input), {
    name: "Error",
    message:
      /CORS_ORIGIN|custom domains require HTTPS|stage-derived web Worker name|production stage/u,
  });
}

process.stdout.write("web settings probe passed\n");
