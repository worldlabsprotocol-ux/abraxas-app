// FILE: lib/partner/integrationKit/trustContinuity/enforcePortableWithContinuity.ts

import type { IndependentVerificationResult, TrustAnchorBundleV1 } from "@abraxas/independent-verifier";
import type { PortableVerificationBundle } from "@/lib/partner/portableIndependentVerification/buildPortableVerificationBundle";
import { verifyPortableBundle } from "@/lib/partner/portableIndependentVerification/verifyWithStandaloneVerifier";
import {
  classifyStandalonePortableVerification,
  type StandalonePortableEnforcement,
} from "@/lib/partner/integrationKit/standalonePortableOutcome";
import {
  resolveTrustedAnchorForBundledExport,
  type IntegratorTrustAnchorRegistryV1,
} from "./integratorAnchorRegistry";
import type { PartnerStatusCheckpointStore, StatusCheckpointScope } from "./statusCheckpointStore";
import { partnerSafeNextActions } from "./partnerSafeNextActions";

export type PortableContinuityEnforcement = StandalonePortableEnforcement & {
  checkpoint:
    | { ok: true; minimum_status_version: number; minimum_registry_version: number }
    | { ok: false; reason: string; recovery: string }
    | { ok: "skipped"; reason: string };
  trust_anchor_match?: "active" | "overlap" | "legacy_pin";
  next_actions: string[];
};

function resolvePinnedAnchor(input: {
  bundled: TrustAnchorBundleV1;
  legacyPin?: TrustAnchorBundleV1;
  registry?: IntegratorTrustAnchorRegistryV1;
  now?: Date;
}):
  | { ok: true; pin: TrustAnchorBundleV1; match: "active" | "overlap" | "legacy_pin" }
  | { ok: false; reason: string } {
  if (input.registry) {
    const resolved = resolveTrustedAnchorForBundledExport({
      bundled: input.bundled,
      registry: input.registry,
      now: input.now,
    });
    if (!resolved.ok) return resolved;
    return { ok: true, pin: resolved.pinnedTrustAnchor, match: resolved.matched };
  }
  if (input.legacyPin) {
    return { ok: true, pin: input.legacyPin, match: "legacy_pin" };
  }
  return { ok: false, reason: "integrator_trust_anchor_pin_required" };
}

export async function enforcePortableVerificationWithTrustContinuity(input: {
  bundle: PortableVerificationBundle;
  partnerId: string;
  policyId: string;
  legacyPin?: TrustAnchorBundleV1;
  registry?: IntegratorTrustAnchorRegistryV1;
  checkpointStore?: PartnerStatusCheckpointStore;
  statementObservedAt?: string;
  now?: Date;
}): Promise<PortableContinuityEnforcement> {
  const now = input.now ?? new Date();
  const bundled = input.bundle.bundled_trust_anchor ?? input.bundle.pinned_trust_anchor;

  const pinResolved = resolvePinnedAnchor({
    bundled,
    legacyPin: input.legacyPin,
    registry: input.registry,
    now,
  });
  if (!pinResolved.ok) {
    const base = classifyStandalonePortableVerification({
      pinConfigured: false,
      fetchErrors: [pinResolved.reason],
    });
    return {
      ...base,
      checkpoint: { ok: "skipped", reason: "trust_not_established" },
      next_actions: partnerSafeNextActions(base.failure_codes),
    };
  }

  const scope: StatusCheckpointScope = {
    environment: input.bundle.decision_receipt.decision_context === "production" ? "production" : "demo",
    partner_id: input.partnerId,
    receipt_id: input.bundle.decision_receipt.id,
  };

  let minimumStatusVersion: number | undefined;
  let minimumRegistryVersion: number | undefined;

  if (input.checkpointStore?.healthCheck) {
    const health = await input.checkpointStore.healthCheck();
    if (health === "corrupted_checkpoint_state") {
      const base = classifyStandalonePortableVerification({
        pinConfigured: true,
        fetchErrors: ["corrupted_checkpoint_state"],
      });
      return {
        ...base,
        checkpoint: {
          ok: false,
          reason: "corrupted_checkpoint_state",
          recovery: partnerSafeNextActions(["corrupted_checkpoint_state"])[0] ?? "",
        },
        trust_anchor_match: pinResolved.match,
        next_actions: partnerSafeNextActions(["corrupted_checkpoint_state"]),
      };
    }
  }

  if (input.checkpointStore) {
    const existing = await input.checkpointStore.read(scope);
    if (existing) {
      minimumStatusVersion = existing.minimum_status_version;
      minimumRegistryVersion = existing.minimum_registry_version;
    }
  }

  const verification: IndependentVerificationResult = verifyPortableBundle({
    bundle: input.bundle,
    integratorPinnedTrustAnchor: pinResolved.pin,
    partnerId: input.partnerId,
    policyId: input.policyId,
    statementObservedAt: input.statementObservedAt,
    minimumStatusVersion,
    minimumRegistryVersion,
    now,
  });

  const enforcement = classifyStandalonePortableVerification({
    pinConfigured: true,
    verification,
  });

  let checkpoint: PortableContinuityEnforcement["checkpoint"] = {
    ok: "skipped",
    reason: "checkpoint_store_not_configured",
  };

  if (input.checkpointStore && verification.status_evidence_authentic) {
    const statusVersion = input.bundle.signed_status_statement.payload.status_version;
    const registryVersion = input.bundle.signed_issuer_authority.payload.registry_version;
    const commit = await input.checkpointStore.commitMonotonic(scope, {
      observed_status_version: statusVersion,
      observed_registry_version: registryVersion,
      authenticated_at: now.toISOString(),
    });
    if (!commit.ok) {
      checkpoint = {
        ok: false,
        reason: commit.reason,
        recovery: partnerSafeNextActions([commit.reason])[0] ?? "Investigate checkpoint store.",
      };
      const rolled = classifyStandalonePortableVerification({
        pinConfigured: true,
        verification: {
          ...verification,
          currently_acceptable: "indeterminate",
          failure_codes: [...verification.failure_codes, commit.reason],
        },
      });
      return {
        ...rolled,
        checkpoint,
        trust_anchor_match: pinResolved.match,
        next_actions: partnerSafeNextActions(rolled.failure_codes),
      };
    }
    checkpoint = {
      ok: true,
      minimum_status_version: commit.checkpoint.minimum_status_version,
      minimum_registry_version: commit.checkpoint.minimum_registry_version,
    };
  }

  return {
    ...enforcement,
    checkpoint,
    trust_anchor_match: pinResolved.match,
    next_actions: partnerSafeNextActions(enforcement.failure_codes),
  };
}
