// FILE: lib/auth/walletAuthorization/scopedChallengeLifecycle.ts
// One-time scoped wallet authorization challenges (in-memory + sovereign PG optional).

import { createHash, randomBytes } from "node:crypto";
import type { WalletScopedTrustBinding } from "./scopedExecutionEnvelope";
import {
  assertPurposeAllowedForTrustExecutionVerification,
  parseWalletAuthorizationPurposeFromMessage,
} from "@/lib/auth/ephemeralWallet/walletAuthorizationPurpose";

export type ScopedChallengeRecord = WalletScopedTrustBinding & {
  challengeId: string;
  messageSha256: string;
  consumedAt: string | null;
};

export type ScopedChallengeConsumeResult =
  | { ok: true; authorizationRef: string; binding: WalletScopedTrustBinding }
  | { ok: false; reason: ScopedChallengeFailureReason };

export type ScopedChallengeFailureReason =
  | "challenge_not_found"
  | "challenge_expired"
  | "challenge_already_consumed"
  | "message_hash_mismatch"
  | "wallet_mismatch"
  | "tenant_mismatch"
  | "application_mismatch"
  | "action_mismatch";

export function hashWalletAuthorizationMessage(message: string): string {
  return createHash("sha256").update(message, "utf8").digest("hex");
}

export function newScopedChallengeId(): string {
  return `wsc_${randomBytes(12).toString("base64url")}`;
}

export function newAuthorizationEvidenceRef(challengeId: string): string {
  return `waev_${createHash("sha256").update(challengeId, "utf8").digest("hex").slice(0, 24)}`;
}

export interface ScopedChallengeStore {
  issue(binding: WalletScopedTrustBinding, message: string): ScopedChallengeRecord;
  consume(input: {
    challengeId: string;
    message: string;
    walletAddress: string;
    partnerId: string;
    applicationId: string | null;
    action: string;
    now?: Date;
  }): ScopedChallengeConsumeResult;
}

export function createInMemoryScopedChallengeStore(): ScopedChallengeStore {
  const byId = new Map<string, ScopedChallengeRecord>();

  return {
    issue(binding, message) {
      const challengeId = binding.requestId.trim() || newScopedChallengeId();
      const record: ScopedChallengeRecord = {
        ...binding,
        challengeId,
        requestId: challengeId,
        messageSha256: hashWalletAuthorizationMessage(message),
        consumedAt: null,
      };
      byId.set(challengeId, record);
      return record;
    },
    consume(input) {
      const record = byId.get(input.challengeId);
      if (!record) return { ok: false, reason: "challenge_not_found" };
      const now = input.now ?? new Date();
      if (Date.parse(record.expiresAt) <= now.getTime()) {
        return { ok: false, reason: "challenge_expired" };
      }
      if (record.consumedAt) return { ok: false, reason: "challenge_already_consumed" };
      const purpose = parseWalletAuthorizationPurposeFromMessage(input.message);
      if (!assertPurposeAllowedForTrustExecutionVerification(purpose).ok) {
        return { ok: false, reason: "action_mismatch" };
      }
      const messageSha256 = hashWalletAuthorizationMessage(input.message);
      if (messageSha256 !== record.messageSha256) {
        return { ok: false, reason: "message_hash_mismatch" };
      }
      if (record.walletAddress !== input.walletAddress.trim()) {
        return { ok: false, reason: "wallet_mismatch" };
      }
      if (record.partnerId !== input.partnerId.trim()) {
        return { ok: false, reason: "tenant_mismatch" };
      }
      const expectedApp = record.applicationId?.trim() || null;
      const gotApp = input.applicationId?.trim() || null;
      if (expectedApp !== gotApp) return { ok: false, reason: "application_mismatch" };
      if (record.action !== input.action.trim()) return { ok: false, reason: "action_mismatch" };

      record.consumedAt = now.toISOString();
      return {
        ok: true,
        authorizationRef: newAuthorizationEvidenceRef(record.challengeId),
        binding: { ...record },
      };
    },
  };
}
