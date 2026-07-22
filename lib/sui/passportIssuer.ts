// FILE: lib/sui/passportIssuer.ts
// Sponsor wallet: create_passport + issue_stamps after Veriff approve.

import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { getSuiDevnetClient } from "@/lib/sui/client";
import { SUI_DEVNET, getSuiDeployment, passportTypeFilter } from "@/lib/sui/config";
import { parseSuiPassportObject } from "@/lib/sui/parsePassport";
import { stampsToBitmask } from "@/lib/passport/stamps";

/** identity + biometric + compliance after Veriff approve */
export const VERIFF_PASSPORT_STAMPS = stampsToBitmask(["identity", "biometric", "compliance"]);

export interface ProvisionResult {
  objectId: string;
  stampBitmask: number;
  createTxDigest?: string;
  stampsTxDigest?: string;
  alreadyExisted: boolean;
}

function getIssuerKeypair(): Ed25519Keypair {
  const secret = process.env.SUI_SPONSOR_SECRET_KEY ?? process.env.SUI_ISSUER_SECRET_KEY;
  if (!secret) throw new Error("SUI_SPONSOR_SECRET_KEY not configured");
  const { scheme, secretKey } = decodeSuiPrivateKey(secret.trim());
  if (scheme !== "ED25519") throw new Error("Sponsor key must be Ed25519 (suiprivkey…)");
  return Ed25519Keypair.fromSecretKey(secretKey);
}

function getCapId(): string {
  const cap = process.env.SUI_ISSUANCE_CAP_OBJECT_ID?.trim();
  if (cap) return cap;
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error("SUI_ISSUANCE_CAP_OBJECT_ID must be set in Vercel (do not use legacy demo cap)");
  }
  return SUI_DEVNET.demoIssuanceCapObjectId;
}

/** Derive sponsor address from env key — for config verification only. */
export function getSponsorAddressFromEnv(): string | null {
  try {
    const secret = process.env.SUI_SPONSOR_SECRET_KEY ?? process.env.SUI_ISSUER_SECRET_KEY;
    if (!secret) return null;
    const { scheme, secretKey } = decodeSuiPrivateKey(secret.trim());
    if (scheme !== "ED25519") return null;
    return Ed25519Keypair.fromSecretKey(secretKey).getPublicKey().toSuiAddress();
  } catch {
    return null;
  }
}

export type SponsorKeyStatus = "missing" | "invalid" | "valid";

/** Honest diagnostics for /api/sui/passport/sponsor — no secrets exposed. */
export function getSponsorEnvDiagnostics() {
  const capRaw = process.env.SUI_ISSUANCE_CAP_OBJECT_ID?.trim() ?? "";
  const sponsorRaw = process.env.SUI_SPONSOR_SECRET_KEY?.trim() ?? "";
  const issuerRaw = process.env.SUI_ISSUER_SECRET_KEY?.trim() ?? "";
  const keyRaw = sponsorRaw || issuerRaw;

  let sponsor_key_status: SponsorKeyStatus = "missing";
  if (keyRaw) {
    sponsor_key_status = getSponsorAddressFromEnv() ? "valid" : "invalid";
  }

  const cap_length = capRaw.length;
  const cap_length_ok = /^0x[a-fA-F0-9]{64}$/.test(capRaw);

  return {
    sui_network: process.env.SUI_NETWORK ?? process.env.NEXT_PUBLIC_SUI_NETWORK ?? "devnet",
    env_flags: {
      SUI_SPONSOR_SECRET_KEY_set: Boolean(sponsorRaw),
      SUI_ISSUER_SECRET_KEY_set: Boolean(issuerRaw),
      SUI_ISSUANCE_CAP_OBJECT_ID_set: Boolean(capRaw),
      SUI_NETWORK: process.env.SUI_NETWORK ?? null,
      NEXT_PUBLIC_SUI_NETWORK: process.env.NEXT_PUBLIC_SUI_NETWORK ?? null,
    },
    sponsor_key_status,
    issuance_cap_length: cap_length,
    issuance_cap_length_ok: cap_length_ok,
    issuance_cap_expected_length: 66,
    issuer_fully_configured: sponsor_key_status === "valid" && cap_length_ok,
  };
}

export function getSponsorConfig() {
  const sponsorAddress = getSponsorAddressFromEnv();
  const capFromEnv = process.env.SUI_ISSUANCE_CAP_OBJECT_ID?.trim() ?? null;
  const isProduction = Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");
  return {
    sponsor_address: sponsorAddress,
    issuance_cap_object_id: capFromEnv ?? (isProduction ? null : SUI_DEVNET.demoIssuanceCapObjectId),
    cap_from_env: Boolean(capFromEnv),
    using_legacy_demo_cap: !capFromEnv && !isProduction,
    legacy_demo_owner: SUI_DEVNET.demoOwnerAddress,
    legacy_demo_cap: SUI_DEVNET.demoIssuanceCapObjectId,
    configured: Boolean(sponsorAddress && (capFromEnv || !isProduction)),
  };
}

function addressToAuthorityBytes(addr: string): number[] {
  const hex = normalizeSuiAddress(addr).replace(/^0x/, "");
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  if (bytes.length !== 32) throw new Error("Invalid Sui address for authority bytes");
  return bytes;
}

function passportIdFromTx(result: SuiTransactionBlockResponse): string | null {
  for (const change of result.objectChanges ?? []) {
    if (
      change.type === "created" &&
      "objectType" in change &&
      typeof change.objectType === "string" &&
      change.objectType.endsWith("::passport::Passport")
    ) {
      return change.objectId;
    }
  }
  return null;
}

async function findPassportForOwner(holder: string): Promise<string | null> {
  const sui = getSuiDevnetClient();
  const owned = await sui.getOwnedObjects({
    owner: holder,
    filter: { StructType: passportTypeFilter() },
    options: { showContent: true },
  });
  return owned.data[0]?.data?.objectId ?? null;
}

async function readStampBitmask(objectId: string): Promise<number> {
  const sui = getSuiDevnetClient();
  const obj = await sui.getObject({ id: objectId, options: { showContent: true, showType: true } });
  if (!obj.data) return 0;
  const parsed = parseSuiPassportObject(objectId, {
    ...obj.data,
    objType: obj.data.type,
    content: obj.data.content,
  });
  return parsed?.stampBitmask ?? 0;
}

async function sendTx(tx: Transaction, keypair: Ed25519Keypair): Promise<SuiTransactionBlockResponse> {
  const sui = getSuiDevnetClient();
  tx.setSender(keypair.getPublicKey().toSuiAddress());
  const result = await sui.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true, showObjectChanges: true },
  });
  if (result.effects?.status?.status !== "success") {
    throw new Error(result.effects?.status?.error ?? "Sui transaction failed");
  }
  return result;
}

export function isPassportIssuerConfigured(): boolean {
  const hasKey = Boolean(process.env.SUI_SPONSOR_SECRET_KEY ?? process.env.SUI_ISSUER_SECRET_KEY);
  const hasCap = Boolean(process.env.SUI_ISSUANCE_CAP_OBJECT_ID?.trim());
  const isProduction = Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");
  if (isProduction) return hasKey && hasCap;
  return hasKey && (hasCap || Boolean(SUI_DEVNET.demoIssuanceCapObjectId));
}

/** Idempotent: create passport if missing, then issue Veriff stamps. */
export async function provisionOnChainPassport(holder: string): Promise<ProvisionResult> {
  const normalized = normalizeSuiAddress(holder);
  const keypair = getIssuerKeypair();
  const issuerAddr = keypair.getPublicKey().toSuiAddress();
  const authorityBytes = addressToAuthorityBytes(issuerAddr);
  const capId = getCapId();
  const deployment = getSuiDeployment();
  const packageId = deployment.packageId;

  let objectId = await findPassportForOwner(normalized);
  let createTxDigest: string | undefined;

  if (!objectId) {
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::passport::create_passport`,
      arguments: [
        tx.object(capId),
        tx.pure.address(normalized),
        tx.pure.vector("u8", authorityBytes),
      ],
    });
    const result = await sendTx(tx, keypair);
    createTxDigest = result.digest;
    objectId = passportIdFromTx(result) ?? (await findPassportForOwner(normalized));
    if (!objectId) throw new Error("Passport created but object ID not found");
  }

  let stampBitmask = await readStampBitmask(objectId);
  let stampsTxDigest: string | undefined;

  if ((stampBitmask & VERIFF_PASSPORT_STAMPS) !== VERIFF_PASSPORT_STAMPS) {
    const tx2 = new Transaction();
    tx2.moveCall({
      target: `${packageId}::passport::issue_stamps_entry`,
      arguments: [
        tx2.object(capId),
        tx2.object(objectId),
        tx2.pure.u16(VERIFF_PASSPORT_STAMPS),
      ],
    });
    const result2 = await sendTx(tx2, keypair);
    stampsTxDigest = result2.digest;
    stampBitmask = await readStampBitmask(objectId);
  }

  return {
    objectId,
    stampBitmask,
    createTxDigest,
    stampsTxDigest,
    alreadyExisted: !createTxDigest,
  };
}
