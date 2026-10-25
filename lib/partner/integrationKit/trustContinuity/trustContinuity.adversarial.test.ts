import { describe, expect, it } from "vitest";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { buildTrustAnchorBundleV1 } from "@/lib/persistence/boundary/trustDistribution/buildTrustAnchorBundle";
import {
  applyAuthorizedAnchorRotation,
  distrustAnchorFingerprint,
  hashAnchorRotationAuthorization,
  resolveTrustedAnchorForBundledExport,
  type AnchorRotationAuthorizationV1,
  type IntegratorTrustAnchorRegistryV1,
} from "./integratorAnchorRegistry";
import {
  FilePartnerStatusCheckpointStore,
  InMemoryPartnerStatusCheckpointStore,
  type StatusCheckpointScope,
} from "./statusCheckpointStore";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { build821SyntheticFixtureSet } from "@/examples/integration-first-relying-party/syntheticFixtureFactory";
import { enforcePortableVerificationWithTrustContinuity } from "./enforcePortableWithContinuity";
import type { PortableVerificationBundle } from "@/lib/partner/portableIndependentVerification/buildPortableVerificationBundle";
import nacl from "tweetnacl";

const scope: StatusCheckpointScope = {
  environment: "demo",
  partner_id: "partner-integration-821",
  receipt_id: "dr_test_checkpoint",
};

function demoRegistry(active: ReturnType<typeof buildTrustAnchorBundleV1>): IntegratorTrustAnchorRegistryV1 {
  return {
    schema: "abraxas_integrator_trust_registry/1.0.0",
    environment: "demo",
    active,
  };
}

describe("Build #827 trust continuity", () => {
  it("rejects untrusted anchor substitution from bundled export", () => {
    const anchorA = generateTestSigningKeyPair("anchor-a");
    const anchorB = generateTestSigningKeyPair("anchor-b");
    const active = buildTrustAnchorBundleV1({
      anchorKeyId: "anchor-a",
      anchorPublicJwk: anchorA.publicKeyJwk,
      environment: "demo",
    });
    const bundled = buildTrustAnchorBundleV1({
      anchorKeyId: "anchor-b",
      anchorPublicJwk: anchorB.publicKeyJwk,
      environment: "demo",
    });
    const resolved = resolveTrustedAnchorForBundledExport({
      bundled,
      registry: demoRegistry(active),
    });
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe("untrusted_anchor_substitution");
  });

  it("allows overlap anchor during authorized rotation", () => {
    const oldKey = generateTestSigningKeyPair("anchor-old");
    const newKey = generateTestSigningKeyPair("anchor-new");
    const oldBundle = buildTrustAnchorBundleV1({
      anchorKeyId: "anchor-old",
      anchorPublicJwk: oldKey.publicKeyJwk,
      environment: "demo",
    });
    const newBundle = buildTrustAnchorBundleV1({
      anchorKeyId: "anchor-new",
      anchorPublicJwk: newKey.publicKeyJwk,
      environment: "demo",
    });
    let registry = demoRegistry(oldBundle);
    const rotated = applyAuthorizedAnchorRotation({
      registry,
      newActive: newBundle,
      authorization: {
        kind: "operator",
        approval: {
          type: "integrator_operator",
          approved_at: new Date().toISOString(),
          change_ticket: "CHG-827",
          supersedes_fingerprint: oldBundle.public_key_fingerprint,
        },
      },
    });
    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;
    registry = rotated.registry;

    const overlapMatch = resolveTrustedAnchorForBundledExport({
      bundled: oldBundle,
      registry,
    });
    expect(overlapMatch.ok).toBe(true);
    if (overlapMatch.ok) expect(overlapMatch.matched).toBe("overlap");

    const activeMatch = resolveTrustedAnchorForBundledExport({
      bundled: newBundle,
      registry,
    });
    expect(activeMatch.ok).toBe(true);
    if (activeMatch.ok) expect(activeMatch.matched).toBe("active");
  });

  it("rejects rotation signed by wrong (compromised) anchor key", () => {
    const oldKey = generateTestSigningKeyPair("anchor-old");
    const compromised = generateTestSigningKeyPair("compromised");
    const newKey = generateTestSigningKeyPair("anchor-new");
    const oldBundle = buildTrustAnchorBundleV1({
      anchorKeyId: "anchor-old",
      anchorPublicJwk: oldKey.publicKeyJwk,
      environment: "demo",
    });
    const newBundle = buildTrustAnchorBundleV1({
      anchorKeyId: "anchor-new",
      anchorPublicJwk: newKey.publicKeyJwk,
      environment: "demo",
    });
    const registry = demoRegistry(oldBundle);

    const authorization: AnchorRotationAuthorizationV1 = {
      document: "abraxas_integrator_anchor_rotation/1.0.0",
      environment: "demo",
      supersedes_fingerprint: oldBundle.public_key_fingerprint,
      new_anchor_fingerprint: newBundle.public_key_fingerprint,
      authorized_at: new Date().toISOString(),
    };
    const hash = hashAnchorRotationAuthorization(authorization);
    const keyPair = nacl.sign.keyPair.fromSeed(
      Buffer.from(compromised.privateKeyJwk.d as string, "base64url"),
    );
    const sig = nacl.sign.detached(Buffer.from(hash, "hex"), keyPair.secretKey);

    const rotated = applyAuthorizedAnchorRotation({
      registry,
      newActive: newBundle,
      authorization: {
        kind: "signed",
        authorization,
        signatureBase64Url: Buffer.from(sig).toString("base64url"),
      },
    });
    expect(rotated.ok).toBe(false);
  });

  it("distrust blocks previously trusted fingerprint", () => {
    const key = generateTestSigningKeyPair("anchor-x");
    const bundle = buildTrustAnchorBundleV1({
      anchorKeyId: "anchor-x",
      anchorPublicJwk: key.publicKeyJwk,
      environment: "demo",
    });
    const registry = distrustAnchorFingerprint({
      registry: demoRegistry(bundle),
      fingerprint: bundle.public_key_fingerprint,
      reason: "compromise",
    });
    const resolved = resolveTrustedAnchorForBundledExport({ bundled: bundle, registry });
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe("anchor_distrusted");
  });

  it("persists monotonic status checkpoints across process restarts (file store)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "abraxas-cp-"));
    const path = join(dir, "checkpoints.json");
    try {
      const storeA = new FilePartnerStatusCheckpointStore(path);
      const first = await storeA.commitMonotonic(scope, {
        observed_status_version: 4,
        observed_registry_version: 1,
        authenticated_at: "2026-01-01T00:00:00.000Z",
      });
      expect(first.ok).toBe(true);

      const storeB = new FilePartnerStatusCheckpointStore(path);
      const read = await storeB.read(scope);
      expect(read?.minimum_status_version).toBe(4);

      const rollback = await storeB.commitMonotonic(scope, {
        observed_status_version: 3,
        observed_registry_version: 1,
        authenticated_at: "2026-01-02T00:00:00.000Z",
      });
      expect(rollback.ok).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("persists monotonic status checkpoints across restarts (in-memory)", async () => {
    const store = new InMemoryPartnerStatusCheckpointStore();
    const first = await store.commitMonotonic(scope, {
      observed_status_version: 2,
      observed_registry_version: 3,
      authenticated_at: "2026-01-01T00:00:00.000Z",
    });
    expect(first.ok).toBe(true);

    const replay = await store.commitMonotonic(scope, {
      observed_status_version: 1,
      observed_registry_version: 3,
      authenticated_at: "2026-01-02T00:00:00.000Z",
    });
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.reason).toBe("status_version_rollback_rejected");

    const read = await store.read(scope);
    expect(read?.minimum_status_version).toBe(2);
  });

  it("rejects stale signed status when checkpoint is ahead (portable enforcement)", async () => {
    const set = build821SyntheticFixtureSet();
    const store = new InMemoryPartnerStatusCheckpointStore();
    await store.commitMonotonic(
      { ...scope, receipt_id: set.decision_receipt.id },
      {
        observed_status_version: set.signed_status_statement.payload.status_version + 1,
        observed_registry_version: set.issuer_authority_statement.payload.registry_version,
        authenticated_at: new Date().toISOString(),
      },
    );

    const bundle: PortableVerificationBundle = {
      schema: "abraxas_portable_verification_bundle/1.0.0",
      decision_receipt: set.decision_receipt,
      bundled_trust_anchor: set.trust_anchor_bundle,
      pinned_trust_anchor: set.trust_anchor_bundle,
      signed_issuer_authority: set.issuer_authority_statement,
      signed_status_statement: set.signed_status_statement,
      registry_version: set.issuer_authority_statement.payload.registry_version,
      export_provenance: {
        trust_anchor_must_be_independently_pinned: true,
        bundled_trust_anchor_informational_only: true,
        status_evidence_authoritative: true,
        status_evidence_source: "operational_demo_store",
      },
    };

    const result = await enforcePortableVerificationWithTrustContinuity({
      bundle,
      partnerId: "partner-integration-821",
      policyId: "policy-age21-sandbox-821",
      legacyPin: set.trust_anchor_bundle,
      checkpointStore: store,
      statementObservedAt: "2026-06-01T12:00:05.000Z",
      now: new Date("2026-06-01T12:00:05.000Z"),
    });

    expect(result.action).not.toBe("permit");
    expect(result.failure_codes).toContain("status_version_rollback_rejected");
  });
});
