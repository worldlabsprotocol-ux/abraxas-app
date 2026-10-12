import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  type AccountMeta,
} from "@solana/web3.js";
import { anchorGlobalDiscriminator } from "@/lib/solana/trustRegistry/idl/anchorDiscriminator";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";
import { deriveTrustRegistryPda } from "@/lib/solana/trustRegistry/pda";
import { verifyMultisigDestination } from "@/lib/solana/trustRegistry/governance/verifiedMultisigDestinations";

const PROGRAM_ID = new PublicKey(ABRAXAS_TRUST_REGISTRY_PROGRAM_ID);

function ixDisc(name: string): Buffer {
  return Buffer.from(anchorGlobalDiscriminator(name));
}

function u64LE(n: bigint | number): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
}

export type GovernanceTxPreflight =
  | { ok: true }
  | { ok: false; reason: string };

export function preflightNominateGovernance(params: {
  newAuthority: string;
  transferSeq: bigint;
  verifiedMultisigEnv?: string;
}): GovernanceTxPreflight {
  const verified = verifyMultisigDestination(params.newAuthority, {
    envAllowlist: params.verifiedMultisigEnv,
  });
  if (!verified.ok) return { ok: false, reason: verified.reason };
  if (params.transferSeq <= BigInt(0)) return { ok: false, reason: "transfer_seq_must_be_positive" };
  return { ok: true };
}

export function buildExtendRegistryGovernanceLayoutIx(params: {
  governanceAuthority: PublicKey;
  registryDomain: Uint8Array;
}): TransactionInstruction {
  const [registry] = deriveTrustRegistryPda(params.registryDomain, PROGRAM_ID);
  const keys: AccountMeta[] = [
    { pubkey: params.governanceAuthority, isSigner: true, isWritable: true },
    { pubkey: registry, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  const data = Buffer.concat([ixDisc("extend_registry_governance_layout"), Buffer.from(params.registryDomain)]);
  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
}

export function buildNominateGovernanceAuthorityIx(params: {
  governanceAuthority: PublicKey;
  registryDomain: Uint8Array;
  newAuthority: PublicKey;
  transferSeq: bigint;
  verifiedMultisigEnv?: string;
}): TransactionInstruction {
  const pre = preflightNominateGovernance({
    newAuthority: params.newAuthority.toBase58(),
    transferSeq: params.transferSeq,
    verifiedMultisigEnv: params.verifiedMultisigEnv,
  });
  if (!pre.ok) throw new Error(`governance_preflight_failed:${pre.reason}`);

  const [registry] = deriveTrustRegistryPda(params.registryDomain, PROGRAM_ID);
  const keys: AccountMeta[] = [
    { pubkey: params.governanceAuthority, isSigner: true, isWritable: false },
    { pubkey: registry, isSigner: false, isWritable: true },
  ];
  const data = Buffer.concat([
    ixDisc("nominate_governance_authority"),
    params.newAuthority.toBuffer(),
    u64LE(params.transferSeq),
  ]);
  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
}

export function buildAcceptGovernanceAuthorityIx(params: {
  pendingAuthority: PublicKey;
  registryDomain: Uint8Array;
  transferSeq: bigint;
}): TransactionInstruction {
  const [registry] = deriveTrustRegistryPda(params.registryDomain, PROGRAM_ID);
  const keys: AccountMeta[] = [
    { pubkey: params.pendingAuthority, isSigner: true, isWritable: false },
    { pubkey: registry, isSigner: false, isWritable: true },
  ];
  const data = Buffer.concat([ixDisc("accept_governance_authority"), u64LE(params.transferSeq)]);
  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
}

export function buildCancelGovernanceNominationIx(params: {
  governanceAuthority: PublicKey;
  registryDomain: Uint8Array;
}): TransactionInstruction {
  const [registry] = deriveTrustRegistryPda(params.registryDomain, PROGRAM_ID);
  const keys: AccountMeta[] = [
    { pubkey: params.governanceAuthority, isSigner: true, isWritable: false },
    { pubkey: registry, isSigner: false, isWritable: true },
  ];
  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data: ixDisc("cancel_governance_nomination") });
}

export function buildExpireGovernanceNominationIx(params: { registryDomain: Uint8Array }): TransactionInstruction {
  const [registry] = deriveTrustRegistryPda(params.registryDomain, PROGRAM_ID);
  const keys: AccountMeta[] = [{ pubkey: registry, isSigner: false, isWritable: true }];
  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data: ixDisc("expire_governance_nomination") });
}
