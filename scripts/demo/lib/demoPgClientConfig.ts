// FILE: scripts/demo/lib/demoPgClientConfig.ts
// Build verified TLS pg Client options for demo migration apply mode.

import type { ConnectionConfig } from "pg";
import {
  buildSessionPoolerConnectionString,
  parseDemoDatabaseUrl,
  type ParsedDemoDatabaseUrl,
} from "./demoDatabaseUrl";
import {
  assertNodeTlsVerificationEnabled,
  loadDemoSslRootCertFromEnv,
} from "./demoSslRootCert";

export interface DemoPgClientConfig {
  parsed: ParsedDemoDatabaseUrl;
  clientOptions: ConnectionConfig;
}

export function buildDemoPgClientConfig(input: {
  databaseUrl: string;
  env: Record<string, string | undefined>;
}): DemoPgClientConfig {
  assertNodeTlsVerificationEnabled();
  const parsed = parseDemoDatabaseUrl(input.databaseUrl);

  if (parsed.transport === "direct") {
    return {
      parsed,
      clientOptions: {
        connectionString: input.databaseUrl,
      },
    };
  }

  const ca = loadDemoSslRootCertFromEnv(input.env);
  const poolerHostname = parsed.poolerHostname;
  if (!poolerHostname) {
    throw new Error("Session pooler hostname is missing after URL validation");
  }

  return {
    parsed,
    clientOptions: {
      connectionString: buildSessionPoolerConnectionString(input.databaseUrl),
      ssl: {
        rejectUnauthorized: true,
        ca,
        servername: poolerHostname,
      },
    },
  };
}
