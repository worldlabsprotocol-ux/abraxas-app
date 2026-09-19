// FILE: lib/partner/walletStandard/safety.ts
// Fail closed if client JSON grows an address, signature, or key material.

export function assertNoSensitiveWalletClientKeys(payload: unknown): string[] {
  const leaks: string[] = [];
  const blob = JSON.stringify(payload ?? null).toLowerCase();
  const needles = [
    "wallet_address",
    "publickey",
    "public_key",
    "secretkey",
    "private_key",
    "seed phrase",
    "signature",
    "balance",
    "trading_history",
  ];
  for (const needle of needles) {
    if (blob.includes(needle)) leaks.push(needle);
  }
  return leaks;
}
