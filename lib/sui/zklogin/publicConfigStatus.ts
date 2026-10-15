// FILE: lib/sui/zklogin/publicConfigStatus.ts
// Read-only zkLogin configuration readiness for operators (no client id values).

import { timingSafeEqual } from "node:crypto";
import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";
import { PUBLIC_DEMO_ORIGIN } from "@/lib/product/publicOrigin";
import { DEFAULT_PROVING_SERVICE_URL, ZKLOGIN_CALLBACK_PATH } from "@/lib/sui/zklogin/config";
import {
  getServerCanonicalGoogleClientId,
  isBrowserLegacyRecoveryAvailable,
  parseServerLegacyGoogleClientIds,
  getTrustedGoogleAudiences,
} from "@/lib/sui/zklogin/audienceCohorts";
function canonicalGoogleClientIdsAligned(
  env: Record<string, string | undefined>,
): boolean | null {
  const publicId = env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID?.trim();
  const serverId = getServerCanonicalGoogleClientId(env);
  if (!publicId || !serverId) return null;
  const a = Buffer.from(publicId, "utf8");
  const b = Buffer.from(serverId, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function resolveRedirectUriForEnv(env: Record<string, string | undefined>): string {
  const appUrl = (env.NEXT_PUBLIC_APP_URL ?? env.ABRAXAS_ISSUER_URL ?? "").replace(/\/$/, "");
  const runtimeDemo = env.ABRAXAS_RUNTIME_ENV?.trim() === "demo" || appUrl === PUBLIC_DEMO_ORIGIN;
  if (runtimeDemo) {
    return `${PUBLIC_DEMO_ORIGIN}${ZKLOGIN_CALLBACK_PATH}`;
  }
  if (appUrl) {
    return `${appUrl}${ZKLOGIN_CALLBACK_PATH}`;
  }
  return `${getPublicAppOrigin().replace(/\/$/, "")}${ZKLOGIN_CALLBACK_PATH}`;
}

export type ZkLoginPublicConfigStatus = {
  schema: "abraxas.zklogin_public_config/v1";
  client: {
    canonical_oauth_client_id_present: boolean;
    legacy_oauth_client_id_present: boolean;
    oauth_launch_ready: boolean;
    legacy_recovery_launch_ready: boolean;
  };
  server: {
    canonical_oauth_client_id_present: boolean;
    legacy_oauth_client_ids_count: number;
    jwt_verify_ready: boolean;
    browser_session_secret_present: boolean;
    legacy_recovery_server_ready: boolean;
  };
  alignment: {
    public_and_server_canonical_ids_both_present: boolean;
    /** null when either canonical id env is unset; otherwise constant-time equality check (values not exposed). */
    canonical_ids_aligned: boolean | null;
  };
  readiness: {
    /** Env and alignment sufficient for OAuth launch and server JWT verification (not a live login proof). */
    configuration_ready: boolean;
    /** Always false from this probe; requires authorized end-to-end login and browser session test. */
    authentication_operational: false;
    authentication_operational_note: string;
  };
  oauth: {
    redirect_uri: string;
    callback_path: string;
    public_app_origin: string;
    prover_url_configured: boolean;
  };
  probes: {
    login_state_mint_expected: true;
    prepare_epoch_path: "/api/zklogin/prepare";
    /** Paths that return NextAuth disabled stub, not zkLogin status */
    misleading_paths: readonly ["/api/auth/session", "/api/auth/signin"];
  };
};

export function buildZkLoginPublicConfigStatus(
  env: Record<string, string | undefined> = process.env,
): ZkLoginPublicConfigStatus {
  const canonicalPublic = Boolean(env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID?.trim());
  const canonicalServer = Boolean(getServerCanonicalGoogleClientId(env));
  const legacyPublic = Boolean(env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID?.trim());
  const legacyServerCount = parseServerLegacyGoogleClientIds(env).length;
  const browserSessionSecret = Boolean(
    env.ABRAXAS_BROWSER_SESSION_SECRET?.trim() || env.ABRAXAS_SIGNING_KEY?.trim(),
  );
  const idsAligned = canonicalGoogleClientIdsAligned(env);
  const jwtVerifyReady = getTrustedGoogleAudiences(env).length > 0;
  const bothPresent = canonicalPublic && canonicalServer;
  const configurationReady = zkLoginConfigurationReady({
    client: { oauth_launch_ready: canonicalPublic },
    server: {
      jwt_verify_ready: jwtVerifyReady,
      browser_session_secret_present: browserSessionSecret,
    },
    alignment: {
      public_and_server_canonical_ids_both_present: bothPresent,
      canonical_ids_aligned: idsAligned,
    },
  });

  return {
    schema: "abraxas.zklogin_public_config/v1",
    client: {
      canonical_oauth_client_id_present: canonicalPublic,
      legacy_oauth_client_id_present: legacyPublic,
      oauth_launch_ready: canonicalPublic,
      legacy_recovery_launch_ready: legacyPublic,
    },
    server: {
      canonical_oauth_client_id_present: canonicalServer,
      legacy_oauth_client_ids_count: legacyServerCount,
      jwt_verify_ready: jwtVerifyReady,
      browser_session_secret_present: browserSessionSecret,
      legacy_recovery_server_ready: isBrowserLegacyRecoveryAvailable(env),
    },
    alignment: {
      public_and_server_canonical_ids_both_present: canonicalPublic && canonicalServer,
      canonical_ids_aligned: idsAligned,
    },
    readiness: {
      configuration_ready: configurationReady,
      authentication_operational: false,
      authentication_operational_note:
        "Authorized end-to-end Google login and browser session verification required before claiming operational authentication.",
    },
    oauth: {
      redirect_uri: resolveRedirectUriForEnv(env),
      callback_path: ZKLOGIN_CALLBACK_PATH,
      public_app_origin: (env.NEXT_PUBLIC_APP_URL ?? env.ABRAXAS_ISSUER_URL ?? getPublicAppOrigin())
        .replace(/\/$/, ""),
      prover_url_configured: Boolean(
        env.NEXT_PUBLIC_ZKLOGIN_PROVER_URL?.trim() || DEFAULT_PROVING_SERVICE_URL,
      ),
    },
    probes: {
      login_state_mint_expected: true,
      prepare_epoch_path: "/api/zklogin/prepare",
      misleading_paths: ["/api/auth/session", "/api/auth/signin"],
    },
  };
}

export function zkLoginConfigurationReady(status: {
  client: Pick<ZkLoginPublicConfigStatus["client"], "oauth_launch_ready">;
  server: Pick<
    ZkLoginPublicConfigStatus["server"],
    "jwt_verify_ready" | "browser_session_secret_present"
  >;
  alignment: Pick<
    ZkLoginPublicConfigStatus["alignment"],
    "public_and_server_canonical_ids_both_present" | "canonical_ids_aligned"
  >;
}): boolean {
  return (
    status.client.oauth_launch_ready
    && status.server.jwt_verify_ready
    && status.server.browser_session_secret_present
    && status.alignment.public_and_server_canonical_ids_both_present
    && status.alignment.canonical_ids_aligned === true
  );
}

/** @deprecated Use zkLoginConfigurationReady; name avoided implying live authentication. */
export function zkLoginProductionReady(status: ZkLoginPublicConfigStatus): boolean {
  return status.readiness.configuration_ready;
}
