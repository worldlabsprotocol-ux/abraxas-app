// FILE: lib/partner/tradingVenue/nonceStore.ts
// In-process one-time nonce consume. Tenant keyed. No receipt material stored.

const consumed = new Set<string>();

function tenantNonceKey(partnerId: string, nonce: string): string {
  return `${partnerId.trim().toLowerCase()}::${nonce.trim()}`;
}

export function resetTradingVenueNonceStoreForTests(): void {
  consumed.clear();
}

export function consumeTradingVenueNonce(
  partnerId: string,
  nonce: string,
): "consumed" | "replayed" | "invalid" {
  const partner = partnerId.trim();
  const value = nonce.trim();
  if (!partner || !value || value.length < 16 || value.length > 128) {
    return "invalid";
  }
  const key = tenantNonceKey(partner, value);
  if (consumed.has(key)) {
    return "replayed";
  }
  consumed.add(key);
  return "consumed";
}

export function peekTradingVenueNonce(partnerId: string, nonce: string): boolean {
  return consumed.has(tenantNonceKey(partnerId, nonce));
}
