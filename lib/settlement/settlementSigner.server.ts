// FILE: lib/settlement/settlementSigner.server.ts
// Server-only settlement signer key material. Never import from client components.

import "server-only";

import { createHash } from "crypto";
import { type Hex } from "viem";
import { privateKeyToAccount, privateKeyToAddress } from "viem/accounts";

const SIGNER_DOMAIN = "abraxas:settlement:signer:v1:";

function normalizePrivateKey(raw: string): Hex | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (!/^[a-fA-F0-9]{64}$/.test(hex)) return null;
  return `0x${hex}` as Hex;
}

export function loadSettlementSignerPrivateKey(): Hex | null {
  const direct = process.env.ABRAXAS_SETTLEMENT_SIGNER_PRIVATE_KEY;
  if (direct) return normalizePrivateKey(direct);

  const master = process.env.ABRAXAS_SETTLEMENT_SIGNING_KEY;
  if (!master) return null;

  const derived = createHash("sha256").update(SIGNER_DOMAIN).update(master).digest();
  return `0x${derived.toString("hex")}` as Hex;
}

export function deriveSettlementSignerAddress(): `0x${string}` | null {
  const privateKey = loadSettlementSignerPrivateKey();
  if (!privateKey) return null;
  return privateKeyToAddress(privateKey).toLowerCase() as `0x${string}`;
}

export type SettlementSignerValidation =
  | {
      ok: true;
      signerAddress: `0x${string}`;
      account: ReturnType<typeof privateKeyToAccount>;
    }
  | {
      ok: false;
      code: "settlement_signer_unavailable" | "settlement_signer_misconfigured";
    };

export function validateSettlementSignerConfiguration(): SettlementSignerValidation {
  const privateKey = loadSettlementSignerPrivateKey();
  if (!privateKey) {
    return { ok: false, code: "settlement_signer_unavailable" };
  }

  let account: ReturnType<typeof privateKeyToAccount>;
  try {
    account = privateKeyToAccount(privateKey);
  } catch {
    return { ok: false, code: "settlement_signer_misconfigured" };
  }

  const derived = account.address.toLowerCase() as `0x${string}`;
  const configured = process.env.ABRAXAS_SETTLEMENT_SIGNER_ADDRESS?.trim().toLowerCase();
  if (configured && configured !== derived) {
    return { ok: false, code: "settlement_signer_misconfigured" };
  }

  const deployer = process.env.ARC_DEPLOYER_PRIVATE_KEY?.trim().toLowerCase();
  if (deployer) {
    const deployerKey = normalizePrivateKey(deployer);
    if (deployerKey && deployerKey.toLowerCase() === privateKey.toLowerCase()) {
      return { ok: false, code: "settlement_signer_misconfigured" };
    }
  }

  return { ok: true, signerAddress: derived, account };
}
