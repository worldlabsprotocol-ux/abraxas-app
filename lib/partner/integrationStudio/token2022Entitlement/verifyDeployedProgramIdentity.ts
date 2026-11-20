import { Connection, PublicKey } from "@solana/web3.js";
import { programDataElf } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import { solanaProgramElfSha256 } from "@/lib/partner/onchainGateDeployments/solanaElfDigest";
import { SOLANA_UPGRADEABLE_LOADER } from "@/lib/partner/onchainGateDeployments/solanaArtifacts";

function programDataAddressFromProgramAccount(programAccount: {
  owner: PublicKey;
  data: Buffer;
}): string | null {
  if (programAccount.owner.toBase58() !== SOLANA_UPGRADEABLE_LOADER) return null;
  if (programAccount.data.length < 36) return null;
  const disc = programAccount.data.readUInt32LE(0);
  if (disc !== 2) return null;
  return new PublicKey(programAccount.data.subarray(4, 36)).toBase58();
}

/** Fail-closed SHA-256 attestation of upgradeable-loader deployed program ELF. */
export async function verifyDeployedProgramBytecode(
  connection: Connection,
  programId: string,
  expectedSha256Hex: string,
): Promise<{ ok: true; sha256_hex: string } | { ok: false; code: string }> {
  let info;
  try {
    info = await connection.getAccountInfo(new PublicKey(programId), "confirmed");
  } catch {
    return { ok: false, code: "rpc_unavailable" };
  }
  if (!info) return { ok: false, code: "program_not_deployed" };
  if (info.owner.toBase58() !== SOLANA_UPGRADEABLE_LOADER) {
    return { ok: false, code: "program_loader_untrusted" };
  }
  if (!info.executable) return { ok: false, code: "program_not_executable" };

  const programDataPk = programDataAddressFromProgramAccount(info);
  if (!programDataPk) return { ok: false, code: "program_data_missing" };

  let programDataInfo;
  try {
    programDataInfo = await connection.getAccountInfo(new PublicKey(programDataPk), "confirmed");
  } catch {
    return { ok: false, code: "rpc_unavailable" };
  }
  if (!programDataInfo) return { ok: false, code: "program_data_missing" };

  const elf = programDataElf({
    owner: programDataInfo.owner.toBase58(),
    data: programDataInfo.data,
  });
  if (!elf) return { ok: false, code: "program_bytecode_unreadable" };

  const digest = solanaProgramElfSha256(elf).slice(2).toLowerCase();
  const expected = expectedSha256Hex.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expected)) return { ok: false, code: "program_attestation_invalid" };
  if (digest !== expected) return { ok: false, code: "program_bytecode_mismatch" };
  return { ok: true, sha256_hex: digest };
}