import { describe, expect, it } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import { getMultisigPda, getVaultPda } from "@sqds/multisig";
import {
  deriveSquadsMultisigPda,
  deriveSquadsV4VaultPda,
  SQUADS_MULTISIG_V4_PROGRAM_ID,
} from "@/lib/solana/trustRegistry/governance/squadsV4Pda";
import { deriveSquadsVaultPda } from "@/lib/solana/trustRegistry/governance/squadsVault";

describe("Squads v4 PDA derivation (Build #537)", () => {
  it("derives stable multisig and vault PDAs", () => {
    const createKey = Keypair.generate().publicKey;
    const { multisigPda } = deriveSquadsMultisigPda(createKey);
    const [sdkMultisig] = getMultisigPda({ createKey });
    expect(multisigPda.equals(sdkMultisig)).toBe(true);
    const vault = deriveSquadsV4VaultPda(multisigPda, 0);
    const [sdkVault] = getVaultPda({ multisigPda, index: 0 });
    expect(vault.vaultPda.equals(sdkVault)).toBe(true);
    const alias = deriveSquadsVaultPda(multisigPda, 0);
    expect(vault.vaultPda.equals(alias.vaultPda)).toBe(true);
    expect(vault.programId.equals(new PublicKey(SQUADS_MULTISIG_V4_PROGRAM_ID))).toBe(true);
  });

  it("changes vault when multisig or index changes", () => {
    const createKey = Keypair.generate().publicKey;
    const { multisigPda: m1 } = deriveSquadsMultisigPda(createKey);
    const { multisigPda: m2 } = deriveSquadsMultisigPda(Keypair.generate().publicKey);
    const v0 = deriveSquadsV4VaultPda(m1, 0).vaultPda;
    const v1 = deriveSquadsV4VaultPda(m1, 1).vaultPda;
    const vOther = deriveSquadsV4VaultPda(m2, 0).vaultPda;
    expect(v0.equals(v1)).toBe(false);
    expect(v0.equals(vOther)).toBe(false);
  });
});
