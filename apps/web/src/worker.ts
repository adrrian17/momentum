import type { ExportedHandler, Fetcher } from "@cloudflare/workers-types";

interface WebEnv {
  API: Fetcher;
  ASSETS: Fetcher;
}

export default {
  fetch(request, env) {
    const path = new URL(request.url).pathname;

    return (
      path === "/api" || path.startsWith("/api/") ? env.API : env.ASSETS
    ).fetch(request);
  },
} satisfies ExportedHandler<WebEnv>;
