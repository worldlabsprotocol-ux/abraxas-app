// FILE: lib/settlement/walletOwnership.server.ts
// Canonical EVM wallet ownership for settlement authorizations.

import "server-only";

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getActiveWalletBinding, listSubjectWallets } from "@/lib/walletAuthority/service";
import { normalizeEvmAddress } from "@/lib/settlement/validation";
import { SETTLEMENT_PUBLIC_ERRORS } from "@/lib/settlement/publicErrors";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { getReceiptById } from "@/lib/decisionReceipts/service";

export async function getCanonicalEvmWalletForSubject(
  subjectId: string,
): Promise<`0x${string}` | null> {
  const subject = normalizeSuiAddress(subjectId);
  const wallets = await listSubjectWallets(subject);
  const activeEvm = wallets.find(
    (w) => w.chain === "evm" && w.binding_status === "active" && !w.revoked_at,
  );
  if (!activeEvm) return null;
  return normalizeEvmAddress(activeEvm.wallet_address);
}

export async function assertCanonicalEvmWalletOwnership(input: {
  subjectId: string;
  claimedWallet: string;
}): Promise<{ ok: true; wallet: `0x${string}` } | { ok: false; code: string }> {
  const canonical = await getCanonicalEvmWalletForSubject(input.subjectId);
  const claimed = normalizeEvmAddress(input.claimedWallet);
  if (!canonical || !claimed) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.wallet_mismatch };
  }
  if (canonical.toLowerCase() !== claimed.toLowerCase()) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.wallet_mismatch };
  }

  const binding = await getActiveWalletBinding(input.subjectId, claimed, "evm");
  if (!binding) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.wallet_mismatch };
  }

  return { ok: true, wallet: canonical };
}

export async function assertReceiptSubjectMatchesSession(input: {
  receiptId: string;
  subjectId: string;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  const record = await getReceiptById(input.receiptId);
  if (!record) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.receipt_not_found };
  }
  const expected = subjectPseudonymId(normalizeSuiAddress(input.subjectId));
  if (record.subject_pseudonym_id !== expected) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.receipt_audience_mismatch };
  }
  return { ok: true };
}
