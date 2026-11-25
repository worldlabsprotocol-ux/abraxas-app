import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";

export const UPGRADEABLE_LOADER_ID = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

export function verifyDeployedProgramBytes({ name, programInfo, programDataInfo, elf, expectedAuthority }) {
  if (!programInfo?.owner.equals(UPGRADEABLE_LOADER_ID) || !programInfo.executable
      || programInfo.data.length !== 36 || programInfo.data.readUInt32LE(0) !== 2) {
    throw new Error(`${name} program account invalid`);
  }
  if (!programDataInfo?.owner.equals(UPGRADEABLE_LOADER_ID)
      || programDataInfo.data.length < 45 || programDataInfo.data.readUInt32LE(0) !== 3
      || programDataInfo.data[12] !== 1
      || !new PublicKey(programDataInfo.data.subarray(13, 45)).equals(expectedAuthority)) {
    throw new Error(`${name} upgrade authority or ProgramData invalid`);
  }
  if (programDataInfo.data.length < 45 + elf.length
      || !programDataInfo.data.subarray(45, 45 + elf.length).equals(elf)) {
    throw new Error(`${name} deployed bytecode differs from compiled ELF`);
  }
  return {
    program_data: new PublicKey(programInfo.data.subarray(4, 36)).toBase58(),
    upgrade_authority: expectedAuthority.toBase58(),
    elf_sha256: createHash("sha256").update(elf).digest("hex"),
    deployed_slot: Number(programDataInfo.data.readBigUInt64LE(4)),
  };
}

