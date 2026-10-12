//! Squads-isomorphic vault PDA signer rehearsal — local program-test only (Build #537).
//! Seeds match Squads v4 layout; program id differs from production Squads.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::InstructionData;

declare_id!("HfU7eUQ56yCyipjcAja73Fhwf4yKv8YAm4wNiLW4kYXb");

#[program]
pub mod governance_vault_rehearsal {
    use super::*;

    /// CPI `accept_governance_authority` with vault PDA signed via invoke_signed (Squads-isomorphic seeds).
    pub fn execute_accept_governance_via_vault(
        ctx: Context<ExecuteAcceptViaVault>,
        multisig: Pubkey,
        vault_index: u8,
        transfer_seq: u64,
    ) -> Result<()> {
        let vault = ctx.accounts.vault.key();
        let registry = ctx.accounts.registry.key();
        let trust_registry_program = ctx.accounts.trust_registry_program.key();

        let ix = anchor_lang::solana_program::instruction::Instruction {
            program_id: trust_registry_program,
            accounts: vec![
                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(vault, true),
                anchor_lang::solana_program::instruction::AccountMeta::new(registry, false),
            ],
            data: {
                let mut data = abraxas_trust_registry::instruction::AcceptGovernanceAuthority { transfer_seq }.data();
                data
            },
        };

        let signer_seeds: &[&[u8]] = &[
            b"multisig",
            multisig.as_ref(),
            b"vault",
            &[vault_index],
            &[ctx.bumps.vault],
        ];

        invoke_signed(
            &ix,
            &[
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.registry.to_account_info(),
            ],
            &[signer_seeds],
        )
        .map_err(Into::into)
    }
}

#[derive(Accounts)]
#[instruction(multisig: Pubkey, vault_index: u8)]
pub struct ExecuteAcceptViaVault<'info> {
    pub payer: Signer<'info>,
    /// CHECK: Squads-isomorphic vault PDA; signed in CPI.
    #[account(
        seeds = [b"multisig", multisig.as_ref(), b"vault", &[vault_index]],
        bump,
    )]
    pub vault: UncheckedAccount<'info>,
    /// CHECK: Trust registry account (Anchor-owned bytes).
    #[account(mut)]
    pub registry: UncheckedAccount<'info>,
    /// CHECK: Trust registry program id.
    pub trust_registry_program: UncheckedAccount<'info>,
}
