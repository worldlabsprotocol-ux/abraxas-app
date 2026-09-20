// FILE: lib/partner/portableActionContract/clientVisible.ts

import {
  PORTABLE_ACTION_CLIENT_VISIBLE_KEYS,
  type PortableActionClientResult,
} from "./contract";

export function assertNoSensitivePortableClientKeys(payload: unknown): string[] {
  const leaks: string[] = [];
  const blob = JSON.stringify(payload ?? null).toLowerCase();
  const needles = [
    "receipt_id",
    "dr_",
    "signature",
    "wallet_address",
    "email",
    "legal_name",
    "date_of_birth",
    "claim_ref",
    "evaluated_claim",
    "jwt",
    "id_token",
    "private_key",
    "order_id",
    "charge_id",
    "transfer_id",
  ];
  needles.forEach((needle) => {
    if (blob.includes(needle)) leaks.push(needle);
  });
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(blob)) leaks.push("email_like");
  return leaks;
}

export function portableClientKeys(result: PortableActionClientResult): string[] {
  return Object.keys(result).sort();
}

export function expectedPortableClientKeys(): string[] {
  return [...PORTABLE_ACTION_CLIENT_VISIBLE_KEYS].sort();
}
