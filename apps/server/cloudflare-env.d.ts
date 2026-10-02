import type { ServerEnv } from "@momentum/infra/alchemy.run";

// This file infers types for the cloudflare:workers environment from your Alchemy Worker.
// @see https://alchemy.run/cloudflare/compute/workers

export type CloudflareEnv = ServerEnv;

declare global {
  // oxlint-disable-next-line sonarjs/redundant-type-aliases -- Cloudflare tooling requires the global Env name.
  type Env = CloudflareEnv;
}

declare module "cloudflare:workers" {
  namespace Cloudflare {
    // oxlint-disable-next-line typescript/no-empty-interface, typescript/no-empty-object-type -- Cloudflare environment types are extended through declaration merging.
    export interface Env extends CloudflareEnv {}
  }
}
