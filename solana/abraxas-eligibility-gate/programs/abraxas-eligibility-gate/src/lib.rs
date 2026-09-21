// Local/reference Solana eligibility gate. Partners deploy their own copy.
// Abraxas does not deploy this program to devnet or Mainnet.
// Never transfers SOL/tokens, mints, swaps, or calls arbitrary programs.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    ed25519_program,
    sysvar::instructions::{load_current_index_checked, load_instruction_at_checked},
};

pub mod canonical;
pub mod institutional_v2;
use canonical::*;

declare_id!("GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB");

pub const MAX_SIGNERS: usize = 4;
pub const SIGNER_EMPTY: u8 = 0;
pub const SIGNER_ACTIVE: u8 = 1;
pub const SIGNER_RETIRING: u8 = 2;
pub const SIGNER_REVOKED: u8 = 3;

#[program]
pub mod abraxas_eligibility_gate {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>, params: ConfigParams) -> Result<()> {
        require!(!params.partner_program.eq(&Pubkey::default()), GateError::InvalidConfig);
        require!(params.trusted_signer != [0u8; 32], GateError::InvalidConfig);
        require!(params.signer_key_id != [0u8; 32], GateError::InvalidConfig);
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.apply(params.clone())?;
        config.install_initial_signer(params.signer_key_id, params.trusted_signer)?;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn update_config(ctx: Context<UpdateConfig>, params: ConfigParams) -> Result<()> {
        // Binding hashes only. Signers rotate through explicit constrained instructions.
        ctx.accounts.config.apply(params)
    }

    pub fn add_trusted_signer(ctx: Context<MutateSigner>, key_id: [u8; 32], pubkey: [u8; 32]) -> Result<()> {
        ctx.accounts.config.add_signer(key_id, pubkey)
    }

    pub fn retire_trusted_signer(ctx: Context<MutateSigner>, key_id: [u8; 32]) -> Result<()> {
        ctx.accounts.config.retire_signer(key_id)
    }

    pub fn revoke_trusted_signer(ctx: Context<MutateSigner>, key_id: [u8; 32]) -> Result<()> {
        ctx.accounts.config.revoke_signer(key_id)
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
        require!(pubkey_allowed(&config.signers, pubkey), GateError::UnknownSigner);

        let fields = parse_canonical_message_for_config(&message, config.require_institutional)
            .map_err(|_| {
                if config.require_institutional && message.len() == LEGACY_V1_MESSAGE_LEN {
                    GateError::InstitutionalRequired
                } else {
                    GateError::InvalidMessage
                }
            })?;
        require!(fields.attestation_id == attestation_id, GateError::InvalidMessage);
        require!(fields.network_id == config.network_id, GateError::NetworkMismatch);
        require!(fields.partner_hash == config.partner_hash, GateError::PartnerMismatch);
        require!(fields.policy_hash == config.policy_hash, GateError::PolicyMismatch);
        require!(fields.action_hash == config.action_hash, GateError::ActionMismatch);
        require!(fields.environment == config.environment, GateError::EnvironmentMismatch);
        require!(
            signer_matches(&config.signers, pubkey, fields.signer_key_id),
            GateError::SignerKeyMismatch
        );
        if config.require_subject {
            require!(!is_zero32(&fields.subject_hash), GateError::SubjectRequired);
        }
        if config.require_institutional {
            require!(fields.schema_version == SCHEMA_VERSION, GateError::InstitutionalRequired);
            require!(
                !is_zero32(&fields.organization_commitment)
                    && !is_zero32(&fields.actor_commitment)
                    && !is_zero32(&fields.institutional_result_category),
                GateError::InstitutionalRequired
            );
            if !is_zero32(&config.expected_organization_commitment) {
                require!(
                    fields.organization_commitment == config.expected_organization_commitment,
                    GateError::OrganizationMismatch
                );
            }
            if !is_zero32(&config.expected_actor_commitment) {
                require!(
                    fields.actor_commitment == config.expected_actor_commitment,
                    GateError::ActorMismatch
                );
            }
            if !is_zero32(&config.expected_institutional_result_category) {
                require!(
                    fields.institutional_result_category == config.expected_institutional_result_category,
                    GateError::CategoryMismatch
                );
            }
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
        auth.organization_commitment = fields.organization_commitment;
        auth.actor_commitment = fields.actor_commitment;
        auth.institutional_result_category = fields.institutional_result_category;
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

fn pubkey_allowed(slots: &[SignerSlot; MAX_SIGNERS], pubkey: [u8; 32]) -> bool {
    slots.iter().any(|slot| {
        (slot.status == SIGNER_ACTIVE || slot.status == SIGNER_RETIRING) && slot.pubkey == pubkey
    })
}

fn signer_matches(slots: &[SignerSlot; MAX_SIGNERS], pubkey: [u8; 32], key_id: [u8; 32]) -> bool {
    slots.iter().any(|slot| {
        (slot.status == SIGNER_ACTIVE || slot.status == SIGNER_RETIRING)
            && slot.pubkey == pubkey
            && slot.key_id == key_id
    })
}

impl GateConfig {
    fn apply(&mut self, params: ConfigParams) -> Result<()> {
        require!(!params.partner_program.eq(&Pubkey::default()), GateError::InvalidConfig);
        self.partner_program = params.partner_program;
        self.network_id = params.network_id;
        self.partner_hash = params.partner_hash;
        self.policy_hash = params.policy_hash;
        self.action_hash = params.action_hash;
        self.environment = params.environment;
        self.require_subject = params.require_subject;
        self.require_institutional = params.require_institutional;
        self.expected_organization_commitment = params.expected_organization_commitment;
        self.expected_actor_commitment = params.expected_actor_commitment;
        self.expected_institutional_result_category = params.expected_institutional_result_category;
        Ok(())
    }

    fn install_initial_signer(&mut self, key_id: [u8; 32], pubkey: [u8; 32]) -> Result<()> {
        require!(key_id != [0u8; 32] && pubkey != [0u8; 32], GateError::InvalidConfig);
        self.signers[0] = SignerSlot {
            key_id,
            pubkey,
            status: SIGNER_ACTIVE,
        };
        Ok(())
    }

    fn add_signer(&mut self, key_id: [u8; 32], pubkey: [u8; 32]) -> Result<()> {
        require!(key_id != [0u8; 32] && pubkey != [0u8; 32], GateError::UnknownSigner);
        let mut empty: Option<usize> = None;
        for (i, slot) in self.signers.iter().enumerate() {
            if slot.status != SIGNER_EMPTY {
                require!(slot.key_id != key_id && slot.pubkey != pubkey, GateError::DuplicateSigner);
            } else if empty.is_none() {
                empty = Some(i);
            }
        }
        let idx = empty.ok_or(GateError::InvalidConfig)?;
        self.signers[idx] = SignerSlot {
            key_id,
            pubkey,
            status: SIGNER_ACTIVE,
        };
        Ok(())
    }

    fn index_of(&self, key_id: [u8; 32]) -> Result<usize> {
        for (i, slot) in self.signers.iter().enumerate() {
            if slot.status != SIGNER_EMPTY && slot.key_id == key_id {
                return Ok(i);
            }
        }
        err!(GateError::UnknownSigner)
    }

    fn retire_signer(&mut self, key_id: [u8; 32]) -> Result<()> {
        let idx = self.index_of(key_id)?;
        require!(self.signers[idx].status == SIGNER_ACTIVE, GateError::UnknownSigner);
        self.signers[idx].status = SIGNER_RETIRING;
        Ok(())
    }

    fn revoke_signer(&mut self, key_id: [u8; 32]) -> Result<()> {
        let idx = self.index_of(key_id)?;
        self.signers[idx].status = SIGNER_REVOKED;
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
    pub require_institutional: bool,
    pub expected_organization_commitment: [u8; 32],
    pub expected_actor_commitment: [u8; 32],
    pub expected_institutional_result_category: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, Default)]
pub struct SignerSlot {
    pub key_id: [u8; 32],
    pub pubkey: [u8; 32],
    pub status: u8,
}

#[account]
#[derive(InitSpace)]
pub struct GateConfig {
    pub admin: Pubkey,
    pub partner_program: Pubkey,
    pub network_id: [u8; 32],
    pub partner_hash: [u8; 32],
    pub policy_hash: [u8; 32],
    pub action_hash: [u8; 32],
    pub environment: [u8; 32],
    pub require_subject: bool,
    pub require_institutional: bool,
    pub expected_organization_commitment: [u8; 32],
    pub expected_actor_commitment: [u8; 32],
    pub expected_institutional_result_category: [u8; 32],
    pub bump: u8,
    pub signers: [SignerSlot; MAX_SIGNERS],
}

#[account]
#[derive(InitSpace)]
pub struct Authorization {
    pub config: Pubkey,
    pub partner_program: Pubkey,
    pub policy_hash: [u8; 32],
    pub action_hash: [u8; 32],
    pub attestation_ref: [u8; 32],
    pub organization_commitment: [u8; 32],
    pub actor_commitment: [u8; 32],
    pub institutional_result_category: [u8; 32],
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
    #[account(mut, has_one = admin, seeds = [CONFIG_SEED, config.admin.as_ref()], bump = config.bump)]
    pub config: Account<'info, GateConfig>,
}

#[derive(Accounts)]
pub struct MutateSigner<'info> {
    pub admin: Signer<'info>,
    #[account(mut, has_one = admin, seeds = [CONFIG_SEED, config.admin.as_ref()], bump = config.bump)]
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
    #[msg("institutional_required")]
    InstitutionalRequired,
    #[msg("expired")]
    Expired,
    #[msg("replayed")]
    Replayed,
    #[msg("wrong_partner_program")]
    WrongPartnerProgram,
    #[msg("duplicate_signer")]
    DuplicateSigner,
    #[msg("organization_mismatch")]
    OrganizationMismatch,
    #[msg("actor_mismatch")]
    ActorMismatch,
    #[msg("category_mismatch")]
    CategoryMismatch,
}
