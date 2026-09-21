// Local/reference Solana eligibility gate. Partners deploy their own copy.
// Abraxas does not deploy this program to devnet or Mainnet.
// Never transfers SOL/tokens, mints, swaps, or calls arbitrary programs.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    ed25519_program,
    sysvar::instructions::{load_current_index_checked, load_instruction_at_checked},
};

pub mod canonical;
use canonical::*;

declare_id!("GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB");

#[program]
pub mod abraxas_eligibility_gate {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>, params: ConfigParams) -> Result<()> {
        require!(!params.partner_program.eq(&Pubkey::default()), GateError::InvalidConfig);
        require!(params.trusted_signer != [0u8; 32], GateError::InvalidConfig);
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.apply(params)?;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn update_config(ctx: Context<UpdateConfig>, params: ConfigParams) -> Result<()> {
        ctx.accounts.config.apply(params)
    }

    pub fn authorize(ctx: Context<Authorize>, attestation_id: [u8; 32]) -> Result<()> {
        let ix_sysvar = ctx.accounts.instructions.to_account_info();
        let current = load_current_index_checked(&ix_sysvar)?;
        require!(current > 0, GateError::MissingEd25519Instruction);
        let prior = load_instruction_at_checked((current as usize).saturating_sub(1), &ix_sysvar)?;
        require_keys_eq!(prior.program_id, ed25519_program::ID, GateError::WrongPriorInstruction);

        let (pubkey, message) =
            extract_ed25519_pubkey_and_message(&prior.data).map_err(|_| GateError::InvalidMessage)?;
        let config = &ctx.accounts.config;
        require!(pubkey == config.trusted_signer, GateError::UnknownSigner);

        let fields = parse_canonical_message(&message).map_err(|_| GateError::InvalidMessage)?;
        require!(fields.attestation_id == attestation_id, GateError::InvalidMessage);
        require!(fields.network_id == config.network_id, GateError::NetworkMismatch);
        require!(fields.partner_hash == config.partner_hash, GateError::PartnerMismatch);
        require!(fields.policy_hash == config.policy_hash, GateError::PolicyMismatch);
        require!(fields.action_hash == config.action_hash, GateError::ActionMismatch);
        require!(fields.environment == config.environment, GateError::EnvironmentMismatch);
        require!(fields.signer_key_id == config.signer_key_id, GateError::SignerKeyMismatch);
        if config.require_subject {
            require!(!is_zero32(&fields.subject_hash), GateError::SubjectRequired);
        }

        let now = Clock::get()?.unix_timestamp;
        require!(fields.expires_at as i64 > now, GateError::Expired);

        let auth = &mut ctx.accounts.authorization;
        require!(!auth.consumed && !auth.revoked, GateError::Replayed);
        auth.config = config.key();
        auth.partner_program = config.partner_program;
        auth.policy_hash = fields.policy_hash;
        auth.action_hash = fields.action_hash;
        auth.attestation_ref = fields.attestation_id;
        auth.expires_at = fields.expires_at as i64;
        auth.consumed = false;
        auth.revoked = false;
        auth.bump = ctx.bumps.authorization;
        Ok(())
    }

    pub fn consume(ctx: Context<Consume>) -> Result<()> {
        let config = &ctx.accounts.config;
        let auth = &mut ctx.accounts.authorization;
        require_keys_eq!(auth.config, config.key(), GateError::PartnerMismatch);
        require_keys_eq!(auth.partner_program, config.partner_program, GateError::WrongPartnerProgram);
        require_keys_eq!(ctx.accounts.partner_program.key(), config.partner_program, GateError::WrongPartnerProgram);
        require!(!auth.consumed && !auth.revoked, GateError::Replayed);
        let now = Clock::get()?.unix_timestamp;
        require!(auth.expires_at > now, GateError::Expired);
        require!(
            ctx.accounts.consumer_authority.key()
                == Pubkey::find_program_address(&[CONSUMER_AUTH_SEED], &config.partner_program).0,
            GateError::WrongPartnerProgram
        );
        auth.consumed = true;
        Ok(())
    }
}

impl GateConfig {
    fn apply(&mut self, params: ConfigParams) -> Result<()> {
        require!(!params.partner_program.eq(&Pubkey::default()), GateError::InvalidConfig);
        require!(params.trusted_signer != [0u8; 32], GateError::InvalidConfig);
        self.partner_program = params.partner_program;
        self.trusted_signer = params.trusted_signer;
        self.network_id = params.network_id;
        self.partner_hash = params.partner_hash;
        self.policy_hash = params.policy_hash;
        self.action_hash = params.action_hash;
        self.environment = params.environment;
        self.signer_key_id = params.signer_key_id;
        self.require_subject = params.require_subject;
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ConfigParams {
    pub partner_program: Pubkey,
    pub trusted_signer: [u8; 32],
    pub network_id: [u8; 32],
    pub partner_hash: [u8; 32],
    pub policy_hash: [u8; 32],
    pub action_hash: [u8; 32],
    pub environment: [u8; 32],
    pub signer_key_id: [u8; 32],
    pub require_subject: bool,
}

#[account]
#[derive(InitSpace)]
pub struct GateConfig {
    pub admin: Pubkey,
    pub partner_program: Pubkey,
    pub trusted_signer: [u8; 32],
    pub network_id: [u8; 32],
    pub partner_hash: [u8; 32],
    pub policy_hash: [u8; 32],
    pub action_hash: [u8; 32],
    pub environment: [u8; 32],
    pub signer_key_id: [u8; 32],
    pub require_subject: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Authorization {
    pub config: Pubkey,
    pub partner_program: Pubkey,
    pub policy_hash: [u8; 32],
    pub action_hash: [u8; 32],
    pub attestation_ref: [u8; 32],
    pub expires_at: i64,
    pub consumed: bool,
    pub revoked: bool,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + GateConfig::INIT_SPACE,
        seeds = [CONFIG_SEED, admin.key().as_ref()],
        bump
    )]
    pub config: Account<'info, GateConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub admin: Signer<'info>,
    #[account(mut, has_one = admin, seeds = [CONFIG_SEED, admin.key().as_ref()], bump = config.bump)]
    pub config: Account<'info, GateConfig>,
}

#[derive(Accounts)]
#[instruction(attestation_id: [u8; 32])]
pub struct Authorize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [CONFIG_SEED, config.admin.as_ref()], bump = config.bump)]
    pub config: Account<'info, GateConfig>,
    /// CHECK: instructions sysvar. Verified by address.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + Authorization::INIT_SPACE,
        seeds = [AUTH_SEED, config.key().as_ref(), attestation_id.as_ref()],
        bump
    )]
    pub authorization: Account<'info, Authorization>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Consume<'info> {
    pub config: Account<'info, GateConfig>,
    #[account(
        mut,
        seeds = [AUTH_SEED, config.key().as_ref(), authorization.attestation_ref.as_ref()],
        bump = authorization.bump
    )]
    pub authorization: Account<'info, Authorization>,
    /// CHECK: bound partner program id from config.
    pub partner_program: UncheckedAccount<'info>,
    /// CHECK: PDA of the partner program. Must sign via CPI.
    pub consumer_authority: Signer<'info>,
}

#[error_code]
pub enum GateError {
    #[msg("attestation_unavailable")]
    InvalidConfig,
    #[msg("missing_ed25519")]
    MissingEd25519Instruction,
    #[msg("wrong_prior_instruction")]
    WrongPriorInstruction,
    #[msg("unknown_signer")]
    UnknownSigner,
    #[msg("invalid_message")]
    InvalidMessage,
    #[msg("network_mismatch")]
    NetworkMismatch,
    #[msg("partner_mismatch")]
    PartnerMismatch,
    #[msg("policy_mismatch")]
    PolicyMismatch,
    #[msg("action_mismatch")]
    ActionMismatch,
    #[msg("environment_mismatch")]
    EnvironmentMismatch,
    #[msg("signer_key_mismatch")]
    SignerKeyMismatch,
    #[msg("subject_required")]
    SubjectRequired,
    #[msg("expired")]
    Expired,
    #[msg("replayed")]
    Replayed,
    #[msg("wrong_partner_program")]
    WrongPartnerProgram,
}
