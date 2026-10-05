const customDomains = {
  "momentum.adrianayala.mx": "adrianayala.mx",
  "next.momentum.adrianayala.mx": "adrianayala.mx",
} as const;

interface CustomDomain {
  name: keyof typeof customDomains;
  zoneName: "adrianayala.mx";
  previews: false;
}

type WebExposure =
  | { domain: CustomDomain; workersDev: false }
  | {
      domain: null;
      workersDev: { enabled: true; previewsEnabled: false };
    };

function isCustomDomain(
  hostname: string
): hostname is keyof typeof customDomains {
  return Object.hasOwn(customDomains, hostname);
}

function parseOrigin(origin: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(origin);
  } catch {
    throw new Error("CORS_ORIGIN must be an origin URL");
  }

  if (origin !== parsed.origin && origin !== `${parsed.origin}/`) {
    throw new Error("CORS_ORIGIN must use canonical origin syntax");
  }

  if (parsed.username || parsed.password || parsed.pathname !== "/") {
    throw new Error("CORS_ORIGIN cannot contain credentials or a path");
  }

  if (parsed.search || parsed.hash) {
    throw new Error("CORS_ORIGIN cannot contain a query or fragment");
  }

  return parsed;
}

function isLocalOrigin(url: URL): boolean {
  if (url.protocol !== "http:") {
    return false;
  }

  return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}

function isWorkersDevOrigin(url: URL, name: string): boolean {
  if (url.protocol !== "https:" || url.port !== "") {
    return false;
  }

  const [worker, account, service, suffix, ...extra] = url.hostname.split(".");

  if (worker !== name || !account || service !== "workers") {
    return false;
  }

  return suffix === "dev" && extra.length === 0;
}

function standardExposure(): WebExposure {
  return {
    domain: null,
    workersDev: { enabled: true, previewsEnabled: false },
  };
}

export function resolveWebSettings(input: {
  origin: string;
  stage: string;
  dev: boolean;
}) {
  const { origin: rawOrigin, stage, dev } = input;
  const name = `momentum-${stage}-web`.toLowerCase().replaceAll("_", "-");

  if (!/^[a-z0-9-]{1,63}$/u.test(name)) {
    throw new Error("Invalid stage-derived web Worker name");
  }

  if (stage !== "production" && name === "momentum-production-web") {
    throw new Error(
      "Only the production stage can use the production Worker name"
    );
  }

  const url = parseOrigin(rawOrigin);
  const canonicalOrigin = url.origin;

  if (dev && isLocalOrigin(url)) {
    return {
      origin: canonicalOrigin,
      name,
      port: Number(url.port) || 80,
      exposure: standardExposure(),
    };
  }

  const { hostname } = url;

  if (!dev && stage === "production" && isCustomDomain(hostname)) {
    if (url.protocol !== "https:" || url.port !== "") {
      throw new Error(
        "Production custom domains require HTTPS on the default port"
      );
    }

    return {
      origin: canonicalOrigin,
      name,
      port: 80,
      exposure: {
        domain: {
          name: hostname,
          zoneName: customDomains[hostname],
          previews: false,
        },
        workersDev: false,
      } satisfies WebExposure,
    };
  }

  if (!dev && isWorkersDevOrigin(url, name)) {
    return {
      origin: canonicalOrigin,
      name,
      port: 80,
      exposure: standardExposure(),
    };
  }

  throw new Error(
    "CORS_ORIGIN must be a local loopback origin, the selected stage's workers.dev origin, or an approved production custom domain"
  );
}
