// In-process replay guard for institutional consume (tests + single-region dev).
// Production partners should prefer portable action nonces / venue nonce stores.

const consumed = new Set<string>();

function replayKey(partnerId: string, receiptId: string, nonce: string): string {
  return `${partnerId}:${receiptId}:${nonce}`;
}

export function consumeInstitutionalReplayNonce(input: {
  partnerId: string;
  receiptId: string;
  nonce: string;
}): { ok: true } | { ok: false; reason: "replay" | "invalid_nonce" } {
  const nonce = input.nonce.trim();
  if (!nonce || nonce.length > 128) return { ok: false, reason: "invalid_nonce" };
  const key = replayKey(input.partnerId, input.receiptId, nonce);
  if (consumed.has(key)) return { ok: false, reason: "replay" };
  consumed.add(key);
  return { ok: true };
}

export function resetInstitutionalReplayGuardForTests(): void {
  consumed.clear();
}
