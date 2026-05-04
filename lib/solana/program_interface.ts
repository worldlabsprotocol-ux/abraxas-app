// FILE: lib/solana/program/interface.ts
// Abraxas Anchor Program — definitive interface contract.
//
// STATUS: Program not yet deployed. This file defines the exact instruction
// and account layout the Anchor program must implement.
// When deployed, replace the memo-based txBuilder calls with these IDL calls.
//
// DEPLOYMENT STEPS (when ready):
//   1. Install Anchor: `cargo install anchor-cli`
//   2. anchor init abraxas-program --javascript
//   3. Copy the instruction logic below into programs/abraxas-program/src/lib.rs
//   4. anchor build && anchor deploy --provider.cluster mainnet
//   5. Set NEXT_PUBLIC_ABRAXAS_PROGRAM_ID in Vercel env vars
//   6. Replace txBuilder.ts memo instructions with anchor.methods.* calls
//
// PROGRAM ID: Set via NEXT_PUBLIC_ABRAXAS_PROGRAM_ID env var
// CURRENT PLACEHOLDER: 11111111111111111111111111111111 (System Program)

// ─── Account layout ───────────────────────────────────────────────────────────
// Matches Anchor account discriminator + field layout exactly.
// Space: 8 + 32 + 1 + 1 + 1 + 8 + 1 + 44 = 96 bytes

export interface AbraVaultAccount {
    // Anchor discriminator: 8 bytes (sha256("account:AbraVault")[0..8])
    owner:        string;   // Pubkey — 32 bytes
    agentType:    number;   // u8 — 0=balanced, 1=aggressive, 2=conservative
    riskScore:    number;   // u8 — 0–100 (bounded checked math on-chain)
    circuitState: number;   // u8 — 0=LOW, 1=MEDIUM, 2=HIGH, 3=CRITICAL
    lastUpdated:  bigint;   // i64 — Unix timestamp
    version:      number;   // u8 — starts at 1, incremented on every state update
    mintAddress:  string;   // 44 bytes — Token-2022 vault NFT address
  }
  
  // PDA derivation — matches Anchor #[account(seeds = [...])]
  // seed: ["abraxas_vault", owner.key().as_ref()]
  export const VAULT_PDA_SEED = Buffer.from("abraxas_vault");
  
  // ─── Instruction: initialize_vault ───────────────────────────────────────────
  // Creates vault PDA. Owner pays rent. Mints 1 Token-2022 NFT to owner.
  //
  // Rust equivalent:
  //   pub fn initialize_vault(ctx: Context<InitializeVault>, agent_type: u8) -> Result<()> {
  //     let vault = &mut ctx.accounts.vault;
  //     vault.owner = ctx.accounts.owner.key();
  //     vault.agent_type = agent_type;
  //     vault.risk_score = 50;          // default: MEDIUM
  //     vault.circuit_state = 1;         // MEDIUM
  //     vault.last_updated = Clock::get()?.unix_timestamp;
  //     vault.version = 1;
  //     Ok(())
  //   }
  //
  // Accounts required:
  //   [signer, writable] owner         — user wallet
  //   [writable]         vault          — PDA ["abraxas_vault", owner]
  //   [writable]         vault_mint     — new Token-2022 mint keypair
  //   [writable]         owner_token_account — ATA for vault_mint
  //   []                 token_program  — Token-2022 program
  //   []                 system_program
  //   []                 rent
  
  export interface InitializeVaultAccounts {
    owner:              string;  // signer
    vault:              string;  // PDA
    vaultMint:          string;  // new mint
    ownerTokenAccount:  string;  // ATA
  }
  
  export interface InitializeVaultArgs {
    agentType: number; // 0 | 1 | 2
  }
  
  // ─── Instruction: update_vault_state ─────────────────────────────────────────
  // Updates risk_score + circuit_state. Owner OR delegated authority can sign.
  // Uses checked_add / checked_sub — panics on overflow (safe Rust).
  //
  // Rust equivalent:
  //   pub fn update_vault_state(
  //     ctx: Context<UpdateVaultState>,
  //     new_risk_score: u8,
  //   ) -> Result<()> {
  //     require!(new_risk_score <= 100, AbraError::RiskScoreOutOfBounds);
  //     let vault = &mut ctx.accounts.vault;
  //     require!(
  //       ctx.accounts.signer.key() == vault.owner ||
  //       ctx.accounts.signer.key() == DELEGATED_AUTHORITY,
  //       AbraError::Unauthorized
  //     );
  //     vault.risk_score = new_risk_score;
  //     vault.circuit_state = match new_risk_score {
  //       0..=24  => 0,  // LOW
  //       25..=49 => 1,  // MEDIUM
  //       50..=74 => 2,  // HIGH
  //       _       => 3,  // CRITICAL
  //     };
  //     vault.last_updated = Clock::get()?.unix_timestamp;
  //     vault.version = vault.version.checked_add(1).ok_or(AbraError::VersionOverflow)?;
  //     Ok(())
  //   }
  
  export interface UpdateVaultStateAccounts {
    signer: string;  // owner OR delegated authority
    vault:  string;  // PDA
  }
  
  export interface UpdateVaultStateArgs {
    newRiskScore: number; // 0–100, enforced by require!()
  }
  
  // ─── Instruction: apply_agent_action ─────────────────────────────────────────
  // Applies Sophia strategy reduction. Bounded arithmetic — cannot go below 0.
  //
  // Rust equivalent:
  //   pub fn apply_agent_action(
  //     ctx: Context<ApplyAgentAction>,
  //     reduction: u8,
  //   ) -> Result<()> {
  //     let vault = &mut ctx.accounts.vault;
  //     require!(
  //       ctx.accounts.owner.key() == vault.owner,
  //       AbraError::Unauthorized
  //     );
  //     // Bounded subtraction — floor at 0
  //     vault.risk_score = vault.risk_score.saturating_sub(reduction);
  //     vault.circuit_state = match vault.risk_score {
  //       0..=24  => 0,
  //       25..=49 => 1,
  //       50..=74 => 2,
  //       _       => 3,
  //     };
  //     vault.last_updated = Clock::get()?.unix_timestamp;
  //     vault.version = vault.version.checked_add(1).ok_or(AbraError::VersionOverflow)?;
  //     Ok(())
  //   }
  //
  // Strategy bounds (enforced on client before building tx):
  //   balanced:     reduction 20–30
  //   aggressive:   reduction 30–40
  //   conservative: reduction 10–20
  
  export interface ApplyAgentActionAccounts {
    owner: string;  // must match vault.owner
    vault: string;  // PDA
  }
  
  export interface ApplyAgentActionArgs {
    reduction: number; // bounded 10–40 depending on strategy
  }
  
  // ─── Error codes ──────────────────────────────────────────────────────────────
  // Rust enum AbraError — maps to Anchor error codes 6000+
  export const ABRA_ERRORS: Record<number, string> = {
    6000: "Unauthorized — signer does not match vault owner or delegated authority",
    6001: "RiskScoreOutOfBounds — score must be 0–100",
    6002: "VersionOverflow — vault version counter overflow",
    6003: "CooldownActive — update too soon after last state change",
  };
  
  // ─── Future: fetch + deserialize vault from chain ────────────────────────────
  // When program is deployed, use this to hydrate UI from on-chain state.
  // Replace localStorage as source of truth.
  //
  // import { Program, AnchorProvider } from "@coral-xyz/anchor";
  // import { IDL } from "./abraxas_idl";
  //
  // export async function fetchVaultFromChain(
  //   connection: Connection,
  //   owner: PublicKey,
  //   programId: PublicKey,
  // ): Promise<AbraVaultAccount | null> {
  //   const [pda] = deriveVaultPda(owner);
  //   const accountInfo = await connection.getAccountInfo(pda);
  //   if (!accountInfo) return null;
  //   return deserializeVaultAccount(accountInfo.data);
  // }