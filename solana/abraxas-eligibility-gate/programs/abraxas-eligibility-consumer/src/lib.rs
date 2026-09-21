// Reference consumer. Records a test authorization result only.
// Never transfers SOL/tokens, mints, swaps, or calls arbitrary programs.

use abraxas_eligibility_gate::canonical::{CONSUMER_AUTH_SEED, RESULT_SEED};
use abraxas_eligibility_gate::cpi;
use abraxas_eligibility_gate::cpi::accounts::Consume;
use abraxas_eligibility_gate::program::AbraxasEligibilityGate;
use abraxas_eligibility_gate::{Authorization, GateConfig};
use anchor_lang::prelude::*;

declare_id!("J2xccRtuG43drESLYznHhLhQkLTdfepcKYbiQ9BsJVaf");

#[program]
pub mod abraxas_eligibility_consumer {
    use super::*;

    pub fn record_named_action(ctx: Context<RecordNamedAction>) -> Result<()> {
        require_keys_eq!(ctx.accounts.partner_program.key(), crate::ID, ConsumerError::WrongProgram);
        let bump = ctx.bumps.consumer_authority;
        let signer_seeds: &[&[u8]] = &[CONSUMER_AUTH_SEED, &[bump]];
        cpi::consume(CpiContext::new_with_signer(
            ctx.accounts.gate_program.to_account_info(),
            Consume {
                config: ctx.accounts.config.to_account_info(),
                authorization: ctx.accounts.authorization.to_account_info(),
                partner_program: ctx.accounts.partner_program.to_account_info(),
                consumer_authority: ctx.accounts.consumer_authority.to_account_info(),
            },
            &[signer_seeds],
        ))?;
        let result = &mut ctx.accounts.result;
        result.authorization = ctx.accounts.authorization.key();
        result.accepted = true;
        result.bump = ctx.bumps.result;
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct TestResult {
    pub authorization: Pubkey,
    pub accepted: bool,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct RecordNamedAction<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub gate_program: Program<'info, AbraxasEligibilityGate>,
    pub config: Account<'info, GateConfig>,
    #[account(mut)]
    pub authorization: Account<'info, Authorization>,
    /// CHECK: this consumer program id; must match gate config partner_program.
    pub partner_program: UncheckedAccount<'info>,
    /// CHECK: PDA signer of this program.
    #[account(seeds = [CONSUMER_AUTH_SEED], bump)]
    pub consumer_authority: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + TestResult::INIT_SPACE,
        seeds = [RESULT_SEED, authorization.key().as_ref()],
        bump
    )]
    pub result: Account<'info, TestResult>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ConsumerError {
    #[msg("wrong_program")]
    WrongProgram,
}
