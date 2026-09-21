// FILE: lib/partner/chainAttestation/issue.ts
// Server-authoritative chain eligibility attestation issuance. Fail closed.

import { isAddress } from "viem";
import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";
import { getNetworkCapability } from "@/lib/partner/networkCapability/registry";
import { evaluateNetworkAction } from "@/lib/partner/networkCapability/evaluate";
import {
  CHAIN_ATTESTATION_CLIENT_OVERRIDE_KEYS,
  CHAIN_ATTESTATION_EVM_TYPE_SCOPES,
  CHAIN_ATTESTATION_SCHEMA_VERSION,
  CHAIN_ATTESTATION_SOLANA_SCOPE,
  isChainAttestationEvmAction,
  isChainAttestationEvmNetwork,
  isChainAttestationSolanaNetwork,
  type ChainAttestationSafeReason,
  type ChainEligibilityAttestationFields,
} from "./contract";
import { eip712Domain, eip712TypedData } from "./eip712";
import { loadEvmAttestationSigner } from "./signer";
import { consumeChainAttestationNonce } from "./nonceStore";
import { ChainAttestationStoreUnavailableError } from "./errors";
import {
  bytes32FromUuid,
  hashAction,
  hashEnvironment,
  hashNetworkId,
  hashPartnerId,
  hashPolicy,
  hashSignerKeyId,
  hashSubjectBinding,
  randomBytes32,
  unixSeconds,
} from "./hashes";
import { encodeSolanaEligibilityMessage, bytesToHex } from "./solanaMessage";
import { projectChainAttestationClient, type ChainAttestationClientView } from "./project";

const DEFAULT_TTL_MS = 10 * 60 * 1000;

export function hasChainAttestationClientOverride(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  return Object.keys(body as Record<string, unknown>).some((key) =>
    (CHAIN_ATTESTATION_CLIENT_OVERRIDE_KEYS as readonly string[]).includes(key),
  );
}

export interface IssueChainAttestationInput {
  kit: AbraxasPartnerKit;
  receiptId: string;
  action_type: string;
  action_scope: string;
  network_id: string;
  chainId?: number;
  verifyingContract?: string;
  wallet_binding_hash?: string | null;
  wallet_binding_mode?: "not_attached" | "optional" | "required";
  now?: Date;
  ttlMs?: number;
}

export type IssueChainAttestationResult =
  | {
      ok: true;
      encoding: "eip712" | "solana";
      fields: ChainEligibilityAttestationFields;
      client: ChainAttestationClientView;
      typed_data?: ReturnType<typeof eip712TypedData>;
      signature?: `0x${string}`;
      solana_message?: `0x${string}`;
      attestation_id: string;
    }
  | { ok: false; reason: ChainAttestationSafeReason; client: ChainAttestationClientView };

function denied(
  reason: ChainAttestationSafeReason,
  actionType: string,
  actionScope: string,
  networkId: string | null,
  environment: "sandbox" | "production" | null,
): IssueChainAttestationResult {
  const client = projectChainAttestationClient({
    allowed: false,
    reason,
    action_binding: {
      action_type: actionType,
      action_scope: actionScope,
      nonce_state: "rejected",
      wallet_binding: "not_attached",
    },
    expires_at: null,
    schema_version: 1,
    network_id: networkId,
    environment,
  });
  return { ok: false, reason, client };
}

export async function issueChainEligibilityAttestation(
  input: IssueChainAttestationInput,
): Promise<IssueChainAttestationResult> {
  if (hasChainAttestationClientOverride(input)) {
    return denied("invalid", input.action_type, input.action_scope, null, input.kit.options.environment);
  }

  const evmAction = isChainAttestationEvmAction(input.action_type);
  const solanaAction = input.action_type === "partner_protocol_action";
  if (evmAction) {
    const expected = CHAIN_ATTESTATION_EVM_TYPE_SCOPES[input.action_type as keyof typeof CHAIN_ATTESTATION_EVM_TYPE_SCOPES];
    if (input.action_scope !== expected) {
      return denied("action_mismatch", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
    }
    if (!isChainAttestationEvmNetwork(input.network_id)) {
      return denied("network_disabled", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
    }
  } else if (solanaAction) {
    if (input.action_scope !== CHAIN_ATTESTATION_SOLANA_SCOPE || !isChainAttestationSolanaNetwork(input.network_id)) {
      return denied("action_mismatch", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
    }
  } else {
    return denied("action_mismatch", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
  }

  const network = getNetworkCapability(input.network_id);
  if (!network) {
    return denied("network_disabled", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
  }
  if (network.status === "disabled") {
    return denied("network_disabled", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
  }

  const verified = await input.kit.verifyReceiptId(input.receiptId);
  if (!permitProtocolAction(verified)) {
    const mapped: ChainAttestationSafeReason =
      verified.outcome === "denied" ? "policy_denied"
        : verified.outcome === "expired" ? "receipt_expired"
        : verified.outcome === "revoked" ? "receipt_revoked"
        : verified.outcome === "wrong_partner" ? "partner_mismatch"
        : verified.outcome === "wrong_policy" || String(verified.outcome).startsWith("policy_version") || verified.outcome === "wrong_policy_version" ? "policy_mismatch"
        : verified.outcome === "environment_mismatch" ? "environment_mismatch"
        : "invalid";
    return denied(mapped, input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
  }

  const readiness = evaluateNetworkAction({
    networkId: input.network_id,
    context: {
      productionAccessApproved: input.kit.options.environment === "production",
      kitEnvironment: input.kit.options.environment,
      receiptCurrentlyValid: true,
      durableReplaySatisfied: true,
      partnerExecutionIntegration: true,
      actionType: input.action_type,
    },
  });
  if (!readiness.ok) {
    const reason: ChainAttestationSafeReason =
      readiness.reason === "disabled" || readiness.reason === "planned" || readiness.reason === "not_configured"
        ? "network_disabled"
        : readiness.reason === "production_review_required"
          ? "production_review_required"
          : readiness.reason === "environment_mismatch"
            ? "environment_mismatch"
            : readiness.reason === "unsupported_action"
              ? "action_mismatch"
              : "invalid";
    return denied(reason, input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
  }

  const requireSubject = input.wallet_binding_mode === "required" || network.wallet_binding === "required";
  const subjectHash = hashSubjectBinding(input.wallet_binding_hash);
  if (requireSubject && (!input.wallet_binding_hash || subjectHash.endsWith("0".repeat(64)))) {
    return denied("wallet_binding_missing", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
  }

  const now = input.now ?? new Date();
  const ttl = Math.min(Math.max(input.ttlMs ?? DEFAULT_TTL_MS, 30_000), 15 * 60 * 1000);
  const issuedAt = unixSeconds(now.toISOString());
  const expiresAt = unixSeconds(new Date(now.getTime() + ttl).toISOString());
  const nonce = randomBytes32();
  const attestationUuid = crypto.randomUUID();
  const partnerHash = hashPartnerId(input.kit.options.partnerId);

  if (evmAction) {
    const signer = loadEvmAttestationSigner();
    if (!signer.ok) {
      return denied("attestation_unavailable", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
    }
    if (typeof input.chainId !== "number" || !Number.isInteger(input.chainId) || input.chainId <= 0) {
      return denied("invalid", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
    }
    const verifying = input.verifyingContract?.trim() ?? "";
    if (!isAddress(verifying)) {
      return denied("invalid", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
    }
    const fields: ChainEligibilityAttestationFields = {
      schemaVersion: CHAIN_ATTESTATION_SCHEMA_VERSION,
      networkId: hashNetworkId(input.network_id),
      partnerHash,
      policyHash: hashPolicy(input.kit.options.policyId, input.kit.options.policyVersion ?? 1),
      actionHash: hashAction(input.action_type, input.action_scope),
      subjectHash,
      issuedAt,
      expiresAt,
      nonce,
      attestationId: bytes32FromUuid(attestationUuid),
      environment: hashEnvironment(input.kit.options.environment),
      signerKeyId: hashSignerKeyId(signer.signer.keyId),
    };
    try {
      const consume = await consumeChainAttestationNonce({
        partnerId: input.kit.options.partnerId,
        networkId: input.network_id,
        nonce,
        expiresAtIso: new Date(expiresAt * 1000).toISOString(),
      });
      if (consume === "replayed") {
        return denied("replayed", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
      }
      if (consume === "expired") {
        return denied("expired", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
      }
      if (consume !== "consumed") {
        return denied("invalid", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
      }
    } catch (error) {
      if (error instanceof ChainAttestationStoreUnavailableError) {
        return denied("store_unavailable", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
      }
      throw error;
    }
    const domain = eip712Domain({
      chainId: input.chainId,
      verifyingContract: verifying as `0x${string}`,
      partnerHash,
    });
    const signature = await signer.signer.sign(domain, fields);
    const typed_data = eip712TypedData(domain, fields);
    const client = projectChainAttestationClient({
      allowed: true,
      reason: "permitted",
      action_binding: {
        action_type: input.action_type,
        action_scope: input.action_scope,
        nonce_state: "issued",
        wallet_binding: requireSubject ? "required" : (input.wallet_binding_mode ?? "optional"),
      },
      expires_at: new Date(expiresAt * 1000).toISOString(),
      schema_version: 1,
      network_id: input.network_id,
      environment: input.kit.options.environment,
    });
    return {
      ok: true,
      encoding: "eip712",
      fields,
      client,
      typed_data,
      signature,
      attestation_id: attestationUuid,
    };
  }

  const fields: ChainEligibilityAttestationFields = {
    schemaVersion: CHAIN_ATTESTATION_SCHEMA_VERSION,
    networkId: hashNetworkId(input.network_id),
    partnerHash,
    policyHash: hashPolicy(input.kit.options.policyId, input.kit.options.policyVersion ?? 1),
    actionHash: hashAction(input.action_type, input.action_scope),
    subjectHash,
    issuedAt,
    expiresAt,
    nonce,
    attestationId: bytes32FromUuid(attestationUuid),
    environment: hashEnvironment(input.kit.options.environment),
    signerKeyId: hashSignerKeyId("solana-message-unsigned"),
  };
  try {
    const consume = await consumeChainAttestationNonce({
      partnerId: input.kit.options.partnerId,
      networkId: input.network_id,
      nonce,
      expiresAtIso: new Date(expiresAt * 1000).toISOString(),
    });
    if (consume !== "consumed") {
      return denied(consume === "replayed" ? "replayed" : consume === "expired" ? "expired" : "invalid", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
    }
  } catch (error) {
    if (error instanceof ChainAttestationStoreUnavailableError) {
      return denied("store_unavailable", input.action_type, input.action_scope, input.network_id, input.kit.options.environment);
    }
    throw error;
  }
  const client = projectChainAttestationClient({
    allowed: true,
    reason: "permitted",
    action_binding: {
      action_type: input.action_type,
      action_scope: input.action_scope,
      nonce_state: "issued",
      wallet_binding: requireSubject ? "required" : (input.wallet_binding_mode ?? "optional"),
    },
    expires_at: new Date(expiresAt * 1000).toISOString(),
    schema_version: 1,
    network_id: input.network_id,
    environment: input.kit.options.environment,
  });
  return {
    ok: true,
    encoding: "solana",
    fields,
    client,
    solana_message: bytesToHex(encodeSolanaEligibilityMessage(fields)),
    attestation_id: attestationUuid,
  };
}
