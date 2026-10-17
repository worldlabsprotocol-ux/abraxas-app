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

type MemoryState = {
  accounts: Map<string, { status: AbraxasAccountStatus; created_at: string }>;
  passkeys: Map<string, MemoryPasskey>;
  passkeysByCred: Map<string, MemoryPasskey>;
  challenges: Map<string, MemoryChallenge>;
  memberships: Map<string, { role: PartnerMembershipRole; status: "active" | "revoked"; created_at: string }>;
  grants: Array<Record<string, unknown>>;
  enrollments: Array<Record<string, unknown>>;
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
      memberships: new Map(),
      grants: [],
      enrollments: [],
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
  memberships().clear();
  grants().length = 0;
  enrollments().length = 0;
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
};
