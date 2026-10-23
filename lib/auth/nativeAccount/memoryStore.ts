// FILE: lib/auth/nativeAccount/memoryStore.ts
// Test-only in-memory native account store — never a production fallback.

import { randomBytes } from "crypto";
import type { AbraxasAccountStatus, MembershipGrantMethod, PartnerMembershipRole } from "./contract";

export type MemoryPasskey = {
  id: string;
  account_id: string;
  credential_id: string;
  public_key_cose: string;
  sign_count: number;
  transports: string[];
  aaguid: string | null;
  revoked_at: string | null;
};

export type MemoryChallenge = {
  id: string;
  purpose: "register" | "authenticate";
  account_id: string | null;
  challenge: string;
  origin: string;
  rp_id: string;
  expires_at: string;
  consumed_at: string | null;
};

export type MemorySolanaChallenge = {
  id: string;
  wallet_address: string;
  solana_network: string;
  origin: string;
  uri: string;
  request_id: string;
  session_context_hash: string;
  nonce: string;
  message: string;
  expires_at: string;
  consumed_at: string | null;
};

export type MemoryAccountSession = {
  session_id: string;
  account_id: string;
  auth_method: "passkey" | "solana_wallet";
  expires_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
};

export type MemorySolanaWallet = {
  id: string;
  account_id: string;
  wallet_address: string;
  solana_network: string;
  revoked_at: string | null;
  last_used_at: string | null;
};

type MemoryState = {
  accounts: Map<string, { status: AbraxasAccountStatus; created_at: string }>;
  passkeys: Map<string, MemoryPasskey>;
  passkeysByCred: Map<string, MemoryPasskey>;
  challenges: Map<string, MemoryChallenge>;
  solanaChallenges: Map<string, MemorySolanaChallenge>;
  solanaWallets: Map<string, MemorySolanaWallet>;
  accountSessions: Map<string, MemoryAccountSession>;
  memberships: Map<string, { role: PartnerMembershipRole; status: "active" | "revoked"; created_at: string }>;
  grants: Array<Record<string, unknown>>;
  enrollments: Array<Record<string, unknown>>;
  recoveryAttestations: Map<
    string,
    {
      account_id: string;
      partner_id: string;
      application_id: string;
      expires_at: string;
      consumed_at: string | null;
    }
  >;
  adminRecoveryApprovals: Map<
    string,
    {
      approval_id: string;
      attestation_id: string;
      account_id: string;
      partner_id: string;
      application_id: string;
      approver_actor_id: string;
      ownership_basis: string;
      reason: string;
      expires_at: string;
      consumed_at: string | null;
    }
  >;
};

const GLOBAL_KEY = "__abraxas_native_account_memory__";

function memoryState(): MemoryState {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: MemoryState };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      accounts: new Map(),
      passkeys: new Map(),
      passkeysByCred: new Map(),
      challenges: new Map(),
      solanaChallenges: new Map(),
      solanaWallets: new Map(),
      accountSessions: new Map(),
      memberships: new Map(),
      grants: [],
      enrollments: [],
      recoveryAttestations: new Map(),
      adminRecoveryApprovals: new Map(),
    };
  }
  return g[GLOBAL_KEY]!;
}

function accounts() {
  return memoryState().accounts;
}
function passkeys() {
  return memoryState().passkeys;
}
function passkeysByCred() {
  return memoryState().passkeysByCred;
}
function challenges() {
  return memoryState().challenges;
}
function solanaChallenges() {
  return memoryState().solanaChallenges;
}
function solanaWallets() {
  return memoryState().solanaWallets;
}
function accountSessions() {
  return memoryState().accountSessions;
}
function solanaWalletKey(wallet: string, network: string): string {
  return `${network}:${wallet}`;
}
function memberships() {
  return memoryState().memberships;
}
function grants() {
  return memoryState().grants;
}
function enrollments() {
  return memoryState().enrollments;
}

function membershipKey(accountId: string, partnerId: string): string {
  return `${accountId}:${partnerId}`;
}

export function resetNativeAccountMemory(): void {
  accounts().clear();
  passkeys().clear();
  passkeysByCred().clear();
  challenges().clear();
  solanaChallenges().clear();
  solanaWallets().clear();
  accountSessions().clear();
  memberships().clear();
  grants().length = 0;
  enrollments().length = 0;
  memoryState().recoveryAttestations.clear();
  memoryState().adminRecoveryApprovals.clear();
}

export const nativeAccountMemory = {
  insertAccount(accountId: string, status: AbraxasAccountStatus = "active"): void {
    accounts().set(accountId, { status, created_at: new Date().toISOString() });
  },

  getAccount(accountId: string): { status: AbraxasAccountStatus } | null {
    const row = accounts().get(accountId);
    if (!row) return null;
    return { status: row.status };
  },

  insertPasskey(row: Omit<MemoryPasskey, "id"> & { id?: string }): MemoryPasskey {
    const id = row.id ?? `apk_${randomBytes(8).toString("hex")}`;
    const full: MemoryPasskey = { ...row, id };
    passkeys().set(id, full);
    passkeysByCred().set(full.credential_id, full);
    return full;
  },

  getPasskeyByCredentialId(credentialId: string): MemoryPasskey | null {
    return passkeysByCred().get(credentialId) ?? null;
  },

  listPasskeysForAccount(accountId: string): MemoryPasskey[] {
    return Array.from(passkeys().values()).filter((p) => p.account_id === accountId && !p.revoked_at);
  },

  updatePasskeySignCount(credentialId: string, signCount: number): void {
    const pk = passkeysByCred().get(credentialId);
    if (!pk) return;
    pk.sign_count = signCount;
  },

  insertChallenge(row: Omit<MemoryChallenge, "id"> & { id?: string }): MemoryChallenge {
    const id = row.id ?? `wch_${randomBytes(8).toString("hex")}`;
    const full: MemoryChallenge = { ...row, id };
    challenges().set(id, full);
    return full;
  },

  getChallenge(id: string): MemoryChallenge | null {
    return challenges().get(id) ?? null;
  },

  consumeChallenge(id: string): boolean {
    const ch = challenges().get(id);
    if (!ch || ch.consumed_at) return false;
    if (new Date(ch.expires_at).getTime() < Date.now()) return false;
    ch.consumed_at = new Date().toISOString();
    return true;
  },

  consumeChallengeAtomic(id: string): MemoryChallenge | null {
    const ch = challenges().get(id);
    if (!ch || ch.consumed_at) return null;
    if (new Date(ch.expires_at).getTime() < Date.now()) return null;
    ch.consumed_at = new Date().toISOString();
    return ch;
  },

  upsertMembership(accountId: string, partnerId: string, role: PartnerMembershipRole): void {
    memberships().set(membershipKey(accountId, partnerId), {
      role,
      status: "active",
      created_at: new Date().toISOString(),
    });
  },

  insertMembershipIfAbsent(accountId: string, partnerId: string, role: PartnerMembershipRole): boolean {
    const key = membershipKey(accountId, partnerId);
    if (memberships().has(key)) return false;
    memberships().set(key, {
      role,
      status: "active",
      created_at: new Date().toISOString(),
    });
    return true;
  },

  insertRecoveryAttestation(input: {
    attestationId: string;
    accountId: string;
    partnerId: string;
    applicationId: string;
    expiresAt: string;
  }): void {
    memoryState().recoveryAttestations.set(input.attestationId, {
      account_id: input.accountId,
      partner_id: input.partnerId,
      application_id: input.applicationId,
      expires_at: input.expiresAt,
      consumed_at: null,
    });
  },

  consumeRecoveryAttestation(verified: {
    attestationId: string;
    accountId: string;
    partnerId: string;
    applicationId: string;
  }): boolean {
    const row = memoryState().recoveryAttestations.get(verified.attestationId);
    if (!row || row.consumed_at) return false;
    if (new Date(row.expires_at).getTime() < Date.now()) return false;
    if (
      row.account_id !== verified.accountId
      || row.partner_id !== verified.partnerId
      || row.application_id !== verified.applicationId
    ) {
      return false;
    }
    row.consumed_at = new Date().toISOString();
    return true;
  },

  revokeMembership(accountId: string, partnerId: string): void {
    const row = memberships().get(membershipKey(accountId, partnerId));
    if (row) row.status = "revoked";
  },

  getMembership(accountId: string, partnerId: string): { role: PartnerMembershipRole; status: "active" | "revoked" } | null {
    const row = memberships().get(membershipKey(accountId, partnerId));
    if (!row) return null;
    return { role: row.role, status: row.status };
  },

  listMemberships(accountId: string): Array<{ partner_id: string; role: PartnerMembershipRole }> {
    const out: Array<{ partner_id: string; role: PartnerMembershipRole }> = [];
    for (const [key, row] of Array.from(memberships().entries())) {
      const [acc, partner] = key.split(":");
      if (acc === accountId) out.push({ partner_id: partner, role: row.role });
    }
    return out;
  },

  recordGrant(input: {
    account_id: string;
    partner_id: string;
    grant_method: MembershipGrantMethod;
    api_key_id?: string | null;
    metadata?: Record<string, unknown>;
  }): void {
    grants().push({
      id: randomBytes(16).toString("hex"),
      ...input,
      created_at: new Date().toISOString(),
    });
  },

  recordEnrollment(input: {
    account_id: string;
    partner_id: string;
    application_id?: string | null;
    idempotency_key?: string | null;
  }): void {
    enrollments().push({ ...input, created_at: new Date().toISOString() });
  },

  findEnrollmentByApplicationId(applicationId: string): {
    account_id: string;
    partner_id: string;
    application_id: string | null;
  } | null {
    for (const row of enrollments()) {
      if (row.application_id === applicationId) {
        return {
          account_id: String(row.account_id),
          partner_id: String(row.partner_id),
          application_id: row.application_id ? String(row.application_id) : null,
        };
      }
    }
    return null;
  },

  findEnrollmentByAccountPartner(accountId: string, partnerId: string): {
    account_id: string;
    partner_id: string;
    application_id: string | null;
  } | null {
    const row = enrollments().find(
      (e) => e.account_id === accountId && e.partner_id === partnerId,
    );
    if (!row) return null;
    return {
      account_id: String(row.account_id),
      partner_id: String(row.partner_id),
      application_id: row.application_id ? String(row.application_id) : null,
    };
  },

  insertAdminRecoveryApproval(row: {
    approvalId: string;
    attestationId: string;
    accountId: string;
    partnerId: string;
    applicationId: string;
    approverActorId: string;
    ownershipBasis: string;
    reason: string;
    expiresAt: string;
  }): void {
    memoryState().adminRecoveryApprovals.set(row.approvalId, {
      approval_id: row.approvalId,
      attestation_id: row.attestationId,
      account_id: row.accountId,
      partner_id: row.partnerId,
      application_id: row.applicationId,
      approver_actor_id: row.approverActorId,
      ownership_basis: row.ownershipBasis,
      reason: row.reason,
      expires_at: row.expiresAt,
      consumed_at: null,
    });
  },

  consumeAdminRecoveryApproval(input: {
    approvalId: string;
    attestationId: string;
    accountId: string;
    partnerId: string;
    applicationId: string;
  }): boolean {
    const row = memoryState().adminRecoveryApprovals.get(input.approvalId);
    if (!row || row.consumed_at) return false;
    if (new Date(row.expires_at).getTime() < Date.now()) return false;
    if (
      row.attestation_id !== input.attestationId
      || row.account_id !== input.accountId
      || row.partner_id !== input.partnerId
      || row.application_id !== input.applicationId
    ) {
      return false;
    }
    row.consumed_at = new Date().toISOString();
    return true;
  },

  insertSolanaChallenge(row: Omit<MemorySolanaChallenge, "consumed_at"> & { consumed_at?: string | null }): void {
    const full: MemorySolanaChallenge = { ...row, consumed_at: row.consumed_at ?? null };
    solanaChallenges().set(full.id, full);
  },

  consumeSolanaChallengeAtomic(input: {
    challengeId: string;
    walletAddress: string;
    sessionContextHash: string;
  }): MemorySolanaChallenge | null {
    const ch = solanaChallenges().get(input.challengeId);
    if (!ch || ch.consumed_at) return null;
    if (new Date(ch.expires_at).getTime() < Date.now()) return null;
    if (ch.wallet_address !== input.walletAddress) return null;
    if (ch.session_context_hash !== input.sessionContextHash) return null;
    ch.consumed_at = new Date().toISOString();
    return ch;
  },

  findAccountBySolanaWallet(walletAddress: string, solanaNetwork: string): string | null {
    const row = solanaWallets().get(solanaWalletKey(walletAddress, solanaNetwork));
    if (!row || row.revoked_at) return null;
    return row.account_id;
  },

  linkSolanaWallet(input: {
    id: string;
    accountId: string;
    walletAddress: string;
    solanaNetwork: string;
  }): void {
    const key = solanaWalletKey(input.walletAddress, input.solanaNetwork);
    if (solanaWallets().has(key)) return;
    solanaWallets().set(key, {
      id: input.id,
      account_id: input.accountId,
      wallet_address: input.walletAddress,
      solana_network: input.solanaNetwork,
      revoked_at: null,
      last_used_at: new Date().toISOString(),
    });
  },

  setSolanaChallengeExpiresAt(challengeId: string, expiresAt: string): void {
    const ch = solanaChallenges().get(challengeId);
    if (ch) ch.expires_at = expiresAt;
  },

  getPrimarySolanaWalletForAccount(
    accountId: string,
  ): { wallet_address: string; solana_network: string } | null {
    const rows = Array.from(solanaWallets().values()).filter(
      (w) => w.account_id === accountId && !w.revoked_at,
    );
    if (rows.length === 0) return null;
    rows.sort((a, b) => {
      const aTs = a.last_used_at ? Date.parse(a.last_used_at) : 0;
      const bTs = b.last_used_at ? Date.parse(b.last_used_at) : 0;
      return bTs - aTs;
    });
    const top = rows[0]!;
    return { wallet_address: top.wallet_address, solana_network: top.solana_network };
  },

  touchSolanaWallet(walletAddress: string, solanaNetwork: string): void {
    const row = solanaWallets().get(solanaWalletKey(walletAddress, solanaNetwork));
    if (row) row.last_used_at = new Date().toISOString();
  },

  insertAccountSession(row: {
    session_id: string;
    account_id: string;
    auth_method: "passkey" | "solana_wallet";
    expires_at: string;
  }): void {
    accountSessions().set(row.session_id, {
      ...row,
      revoked_at: null,
      revoke_reason: null,
    });
  },

  isAccountSessionActive(sessionId: string, accountId: string): boolean {
    const row = accountSessions().get(sessionId);
    if (!row || row.account_id !== accountId || row.revoked_at) return false;
    return new Date(row.expires_at).getTime() > Date.now();
  },

  revokeAccountSession(sessionId: string, accountId: string, reason: string): boolean {
    const row = accountSessions().get(sessionId);
    if (!row || row.account_id !== accountId || row.revoked_at) return false;
    row.revoked_at = new Date().toISOString();
    row.revoke_reason = reason;
    return true;
  },

  revokeAllAccountSessions(accountId: string, reason: string): number {
    let count = 0;
    accountSessions().forEach((row) => {
      if (row.account_id === accountId && !row.revoked_at) {
        row.revoked_at = new Date().toISOString();
        row.revoke_reason = reason;
        count += 1;
      }
    });
    return count;
  },
};
