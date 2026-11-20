import { PublicKey } from "@solana/web3.js";
import { proofContinuityProgramId } from "@/lib/solana/proofContinuity/pda";
import { ENTITLEMENT_CONSUMER_PROGRAM_ID } from "./constants";

export const ENTITLEMENT_MINT_CONFIG_SEED = Buffer.from("entitlement_mint_config");
export const ENTITLEMENT_MINT_SEED = Buffer.from("entitlement_mint");
export const ENTITLEMENT_MINT_AUTHORITY_SEED = Buffer.from("entitlement_mint_authority");
export const ENTITLEMENT_ISSUANCE_SEED = Buffer.from("entitlement_issuance");
export const RELYING_PARTY_CONFIG_SEED = Buffer.from("relying_party_config");
export const ENTITLEMENT_CONSUMPTION_SEED = Buffer.from("entitlement_consumption");

export function entitlementConsumerProgramId(): PublicKey {
  return new PublicKey(ENTITLEMENT_CONSUMER_PROGRAM_ID);
}

export function findEntitlementMintConfigPda(registry: PublicKey): { address: PublicKey; bump: number } {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [ENTITLEMENT_MINT_CONFIG_SEED, registry.toBuffer()],
    proofContinuityProgramId(),
  );
  return { address, bump };
}

export function findEntitlementMintPda(registry: PublicKey): { address: PublicKey; bump: number } {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [ENTITLEMENT_MINT_SEED, registry.toBuffer()],
    proofContinuityProgramId(),
  );
  return { address, bump };
}

export function findEntitlementMintAuthorityPda(registry: PublicKey): { address: PublicKey; bump: number } {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [ENTITLEMENT_MINT_AUTHORITY_SEED, registry.toBuffer()],
    proofContinuityProgramId(),
  );
  return { address, bump };
}

export function findEntitlementIssuanceLedgerPda(
  registry: PublicKey,
  receiptIdHash: Buffer,
): { address: PublicKey; bump: number } {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [ENTITLEMENT_ISSUANCE_SEED, registry.toBuffer(), receiptIdHash],
    proofContinuityProgramId(),
  );
  return { address, bump };
}

export function findTrustedRelyingPartyConfigPda(admin: PublicKey): { address: PublicKey; bump: number } {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [RELYING_PARTY_CONFIG_SEED, admin.toBuffer()],
    entitlementConsumerProgramId(),
  );
  return { address, bump };
}

export function findEntitlementConsumptionPda(
  registry: PublicKey,
  receiptIdHash: Buffer,
): { address: PublicKey; bump: number } {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [ENTITLEMENT_CONSUMPTION_SEED, registry.toBuffer(), receiptIdHash],
    entitlementConsumerProgramId(),
  );
  return { address, bump };
}