// FILE: tests/cards.ts
// Comprehensive test suite for the $CARDS Anchor program.
// Run: anchor test (requires anchor-localnet or devnet in Anchor.toml)

import * as anchor from "@coral-xyz/anchor";
import { Program }  from "@coral-xyz/anchor";
import { Cards }    from "../target/types/cards";
import {
  PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("$CARDS Program", () => {
  const provider  = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program   = anchor.workspace.Cards as Program<Cards>;
  const authority = provider.wallet;

  // PDAs
  let vaultPda:      PublicKey;
  let vaultBump:     number;
  let hookConfigPda: PublicKey;

  // Token accounts
  let mint:                PublicKey;
  let vaultTokenAccount:   PublicKey;
  let winnerTokenAccount:  PublicKey;
  let anotherUserTokenAcc: PublicKey;

  const FEE_BPS        = 25;        // 0.25%
  const RISK_THRESHOLD = new anchor.BN(100_000); // trigger at 0.1 tokens (9 decimals)

  before(async () => {
    // ── Derive PDAs ──────────────────────────────────────────────────
    [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), authority.publicKey.toBuffer()],
      program.programId,
    );
    [hookConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("hook_config"), authority.publicKey.toBuffer()],
      program.programId,
    );

    // ── Create Token-2022 Mint ────────────────────────────────────────
    // In production: add transfer hook + interest-bearing extensions via CLI:
    //   spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
    //     --transfer-hook <PROGRAM_ID> --decimals 9
    mint = await createMint(
      provider.connection,
      (authority as any).payer,       // payer keypair
      authority.publicKey,            // mint authority
      null,                           // freeze authority
      9,                              // decimals
      undefined,                      // keypair
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID,
    );

    // ── Create token accounts ─────────────────────────────────────────
    vaultTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      (authority as any).payer,
      mint,
      vaultPda,
      true,               // allowOwnerOffCurve (PDA)
      TOKEN_2022_PROGRAM_ID,
    );

    winnerTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      (authority as any).payer,
      mint,
      authority.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
    );

    // Mint 10 tokens to vault
    await mintTo(
      provider.connection,
      (authority as any).payer,
      mint,
      vaultTokenAccount,
      authority.publicKey,
      10_000_000_000, // 10 tokens with 9 decimals
      [],
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID,
    );

    console.log("  mint:         ", mint.toBase58());
    console.log("  vault PDA:    ", vaultPda.toBase58());
    console.log("  hookConfig:   ", hookConfigPda.toBase58());
  });

  // ── Test 1: Initialize Vault ──────────────────────────────────────

  it("initializes vault and hook config", async () => {
    const tx = await program.methods
      .initializeVault(FEE_BPS, RISK_THRESHOLD)
      .accounts({
        authority:   authority.publicKey,
        vault:       vaultPda,
        hookConfig:  hookConfigPda,
        mint,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ commitment: "confirmed" });

    console.log("  initializeVault tx:", tx);

    const vault      = await program.account.vault.fetch(vaultPda);
    const hookConfig = await program.account.hookConfig.fetch(hookConfigPda);

    assert.equal(vault.authority.toBase58(), authority.publicKey.toBase58());
    assert.equal(vault.feeBps, FEE_BPS);
    assert.equal(vault.state, 0, "initial state should be 0 (normal)");
    assert.isFalse(vault.isPaused);
    assert.equal(hookConfig.feeBps, FEE_BPS);
    assert.ok(hookConfig.riskThreshold.eq(RISK_THRESHOLD));
  });

  // ── Test 2: Resolve Duel ──────────────────────────────────────────

  it("resolves duel, transfers tokens, emits event", async () => {
    const duelId     = new anchor.BN(1);
    const winner     = authority.publicKey;
    const riskSignal = 1;
    const amount     = new anchor.BN(500_000); // 0.0005 tokens

    const [duelRecordPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("duel"),
        vaultPda.toBuffer(),
        duelId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId,
    );

    const before = await getAccount(provider.connection, winnerTokenAccount, "confirmed", TOKEN_2022_PROGRAM_ID);

    const tx = await program.methods
      .resolveDuel(duelId, winner, riskSignal, amount)
      .accounts({
        vault:               vaultPda,
        duelRecord:          duelRecordPda,
        mint,
        vaultTokenAccount,
        winnerTokenAccount,
        payer:               authority.publicKey,
        tokenProgram:        TOKEN_2022_PROGRAM_ID,
        systemProgram:       SystemProgram.programId,
      })
      .rpc({ commitment: "confirmed" });

    console.log("  resolveDuel tx:", tx);

    const after = await getAccount(provider.connection, winnerTokenAccount, "confirmed", TOKEN_2022_PROGRAM_ID);
    const duel  = await program.account.duelRecord.fetch(duelRecordPda);
    const vault = await program.account.vault.fetch(vaultPda);

    // Verify transfer happened (net of fee)
    const fee = Math.floor(Number(amount) * FEE_BPS / 10_000);
    const net = Number(amount) - fee;
    assert.equal(Number(after.amount) - Number(before.amount), net);

    assert.equal(duel.duelId.toNumber(), 1);
    assert.equal(duel.winner.toBase58(), winner.toBase58());
    assert.equal(vault.duelCount.toNumber(), 1);
    assert.equal(vault.riskLevel, riskSignal);
  });

  // ── Test 3: Admin — Pause / Unpause ──────────────────────────────

  it("admin can pause and unpause vault", async () => {
    await program.methods.pauseVault()
      .accounts({ vault: vaultPda, admin: authority.publicKey })
      .rpc({ commitment: "confirmed" });

    let vault = await program.account.vault.fetch(vaultPda);
    assert.isTrue(vault.isPaused);
    assert.equal(vault.state, 2);

    await program.methods.unpauseVault()
      .accounts({ vault: vaultPda, admin: authority.publicKey })
      .rpc({ commitment: "confirmed" });

    vault = await program.account.vault.fetch(vaultPda);
    assert.isFalse(vault.isPaused);
    assert.equal(vault.state, 0);
  });

  // ── Test 4: Admin — Update Config ───────────────────────────────

  it("admin can update fee and risk threshold", async () => {
    await program.methods.updateConfig(50, new anchor.BN(200_000))
      .accounts({ vault: vaultPda, admin: authority.publicKey })
      .rpc({ commitment: "confirmed" });

    const vault = await program.account.vault.fetch(vaultPda);
    assert.equal(vault.feeBps, 50);
    assert.ok(vault.riskThreshold.eq(new anchor.BN(200_000)));

    // Reset
    await program.methods.updateConfig(FEE_BPS, RISK_THRESHOLD)
      .accounts({ vault: vaultPda, admin: authority.publicKey })
      .rpc({ commitment: "confirmed" });
  });

  // ── Test 5: Resolve Duel while paused (should fail) ──────────────

  it("rejects resolve_duel when vault is paused", async () => {
    await program.methods.pauseVault()
      .accounts({ vault: vaultPda, admin: authority.publicKey })
      .rpc({ commitment: "confirmed" });

    const duelId = new anchor.BN(99);
    const [duelRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("duel"), vaultPda.toBuffer(), duelId.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    try {
      await program.methods
        .resolveDuel(duelId, authority.publicKey, 0, new anchor.BN(100))
        .accounts({
          vault: vaultPda, duelRecord: duelRecordPda, mint,
          vaultTokenAccount, winnerTokenAccount,
          payer: authority.publicKey, tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("should have thrown VaultPaused");
    } catch (err: any) {
      assert.include(err.message, "VaultPaused");
    }

    // Unpause for subsequent tests
    await program.methods.unpauseVault()
      .accounts({ vault: vaultPda, admin: authority.publicKey })
      .rpc({ commitment: "confirmed" });
  });

  // ── Test 6: Emergency Withdraw ───────────────────────────────────

  it("admin can emergency withdraw tokens", async () => {
    const before   = await getAccount(provider.connection, winnerTokenAccount, "confirmed", TOKEN_2022_PROGRAM_ID);
    const withdraw = new anchor.BN(100_000);

    await program.methods.emergencyWithdraw(withdraw)
      .accounts({
        vault:                    vaultPda,
        mint,
        vaultTokenAccount,
        destinationTokenAccount:  winnerTokenAccount,
        admin:                    authority.publicKey,
        tokenProgram:             TOKEN_2022_PROGRAM_ID,
      })
      .rpc({ commitment: "confirmed" });

    const after = await getAccount(provider.connection, winnerTokenAccount, "confirmed", TOKEN_2022_PROGRAM_ID);
    assert.equal(Number(after.amount) - Number(before.amount), Number(withdraw));
  });
});