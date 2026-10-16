// FILE: lib/partner/build592/portableRevocationLoader.ts

import { readFileSync } from "node:fs";
import type {
  PortableRevocationBootstrapTrust,
  PortableRevocationIssuerTrustPolicy,
  PortableRevocationSignedArtifact,
} from "@/lib/protocol/portableRevocation";
import { bootstrapTrustFromArtifact } from "@/lib/protocol/portableRevocation";

export function loadPortableRevocationSnapshotFromEnv(env: NodeJS.ProcessEnv): {
  ok: true;
  snapshot: PortableRevocationSignedArtifact;
  bootstrapTrusts: PortableRevocationBootstrapTrust[];
} | {
  ok: false;
  code: "snapshot_missing" | "invalid_snapshot_json";
} {
  const path = env.BUILD592_PORTABLE_REVOCATION_SNAPSHOT_PATH?.trim();
  const inline = env.BUILD592_PORTABLE_REVOCATION_SNAPSHOT_JSON?.trim();
  const raw = inline ?? (path ? readFileSync(path, "utf8") : "");
  if (!raw) return { ok: false, code: "snapshot_missing" };
  try {
    const snapshot = JSON.parse(raw) as PortableRevocationSignedArtifact;
    const bootstrapTrusts = [bootstrapTrustFromArtifact({ artifact: snapshot })];
    return { ok: true, snapshot, bootstrapTrusts };
  } catch {
    return { ok: false, code: "invalid_snapshot_json" };
  }
}

export function loadPortableRevocationIssuerTrustFromEnv(env: NodeJS.ProcessEnv): {
  ok: true;
  policy: PortableRevocationIssuerTrustPolicy;
} | {
  ok: false;
  code: "issuer_trust_missing" | "invalid_issuer_trust_json";
} {
  const path = env.BUILD592_PORTABLE_REVOCATION_ISSUER_TRUST_PATH?.trim();
  const inline =
    env.BUILD592_PORTABLE_REVOCATION_ISSUER_TRUST_JSON?.trim()
    ?? env.ABRAXAS_PORTABLE_REVOCATION_ISSUER_TRUST?.trim();
  const raw = inline ?? (path ? readFileSync(path, "utf8") : "");
  if (!raw) return { ok: false, code: "issuer_trust_missing" };
  try {
    return { ok: true, policy: JSON.parse(raw) as PortableRevocationIssuerTrustPolicy };
  } catch {
    return { ok: false, code: "invalid_issuer_trust_json" };
  }
}

export function loadPortableRevocationBootstrapTrustsFromEnv(
  env: NodeJS.ProcessEnv,
  snapshotBootstrap: PortableRevocationBootstrapTrust[],
): PortableRevocationBootstrapTrust[] {
  const path = env.BUILD592_PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_PATH?.trim();
  const inline = env.BUILD592_PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_JSON?.trim();
  const raw = inline ?? (path ? readFileSync(path, "utf8") : "");
  if (!raw) return snapshotBootstrap;
  try {
    const parsed = JSON.parse(raw) as PortableRevocationBootstrapTrust[];
    return Array.isArray(parsed) ? [...snapshotBootstrap, ...parsed] : snapshotBootstrap;
  } catch {
    return snapshotBootstrap;
  }
}
