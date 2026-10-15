// FILE: lib/passport/reusableCredential/serverPortableRevocationSnapshot.ts
// Server-side portable revocation fetch for issuer-backed presentation (never trust client-supplied snapshots).

import "server-only";

import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import type { SignedPassportReusableCredential } from "./contract";
import { build566RevocationSnapshotForCredential } from "./fixtures";

export type FetchPortableRevocationSnapshotResult =
  | { ok: true; snapshot: PortableRevocationSignedArtifact; sandbox_fixture: boolean; server_fetched: boolean }
  | { ok: false; code: string; httpStatus: number; note?: string };

export async function fetchPortableRevocationSnapshotForCredential(input: {
  credential: SignedPassportReusableCredential;
  env?: Record<string, string | undefined>;
}): Promise<FetchPortableRevocationSnapshotResult> {
  const env = input.env ?? (process.env as Record<string, string | undefined>);
  if (input.credential.payload.provenance.idv_method === "sandbox_fixture") {
    return {
      ok: true,
      snapshot: build566RevocationSnapshotForCredential(input.credential.payload.credential_id),
      sandbox_fixture: true,
      server_fetched: true,
    };
  }

  const publisherUrl = env.ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL?.trim();
  if (!publisherUrl) {
    return {
      ok: false,
      code: "portable_revocation_publisher_unconfigured",
      httpStatus: 503,
      note: "Issuer-backed presentation requires a configured portable revocation publisher.",
    };
  }

  const statusId = input.credential.payload.revocation_status_id;
  const url = `${publisherUrl.replace(/\/$/, "")}/status/${encodeURIComponent(statusId)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return { ok: false, code: "publisher_fetch_failed", httpStatus: 502 };
    }
    const snapshot = (await res.json()) as PortableRevocationSignedArtifact;
    return { ok: true, snapshot, sandbox_fixture: false, server_fetched: true };
  } catch {
    return { ok: false, code: "publisher_unreachable", httpStatus: 502 };
  }
}
