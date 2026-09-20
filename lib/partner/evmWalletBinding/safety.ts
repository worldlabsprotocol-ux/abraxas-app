// FILE: lib/partner/evmWalletBinding/safety.ts

export function assertNoSensitiveEvmWalletClientKeys(payload: unknown): string[] {
  const leaks: string[] = [];
  const blob = JSON.stringify(payload ?? null).toLowerCase();
  const needles = [
    "wallet_address",
    '"publickey"',
    "public_key",
    "secretkey",
    "private_key",
    "seed phrase",
    "signature_valid",
    '"signature"',
    '"balance"',
    "rpc_url",
    "calldata",
  ];
  for (const needle of needles) {
    if (blob.includes(needle)) leaks.push(needle);
  }
  if (/0x[a-f0-9]{40}(?![a-f0-9])/i.test(blob)) leaks.push("hex_address");
  if (/0x[a-f0-9]{130}/i.test(blob)) leaks.push("hex_signature");
  return leaks;
}

export function rejectEvmWalletClientOverride(body: unknown, allowed: readonly string[]): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return true;
  const keys = Object.keys(body as Record<string, unknown>);
  return keys.some((key) => !(allowed as readonly string[]).includes(key));
}
