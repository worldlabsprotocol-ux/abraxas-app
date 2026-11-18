// BUILD #975 — receipt payload hash + monotonic status on Solana (no receipt body on-chain).
// Local/reference only. Does not replace Launchpad PostgreSQL or host verifier authority.

use abraxas_eligibility_gate::canonical::extract_ed25519_pubkey_and_message;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    ed25519_program,
    sysvar::instructions::{load_current_index_checked, load_instruction_at_checked},
};

declare_id!("FtDugarhArqNTeuGzvQhFV9wQAxTFn8bifhPrCH4dhd1");

pub const REGISTRY_SEED: &[u8] = b"proof_registry";
pub const COMMITMENT_SEED: &[u8] = b"receipt_commitment";
pub const SANDBOX_BINDING_SEED: &[u8] = b"sandbox_binding";
pub const EXECUTION_LEDGER_SEED: &[u8] = b"execution_ledger";
pub const PROOF_CONTINUITY_PREFIX: &[u8] = b"ABRAXAS_PROOF_CONTINUITY_V1";
/// Status changes use a separate signed domain and include the requested status.
pub const STATUS_UPDATE_PREFIX: &[u8] = b"ABRAXAS_PROOF_STATUS_V1";
pub const COMMITMENT_MESSAGE_LEN: usize =
    PROOF_CONTINUITY_PREFIX.len() + 32 + 32 + 32 + 32 + 32 + 8 + 8 + 8;
pub const STATUS_UPDATE_MESSAGE_LEN: usize =
    STATUS_UPDATE_PREFIX.len() + 32 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 1;

pub const STATUS_ACTIVE: u8 = 0;
pub const STATUS_REVOKED: u8 = 1;
pub const STATUS_EXPIRED: u8 = 2;

#[program]
pub mod abraxas_proof_continuity {
    use super::*;

    pub fn initialize_proof_registry(
        ctx: Context<InitializeProofRegistry>,
        trusted_issuer_pubkey: [u8; 32],
        partner_hash: [u8; 32],
        policy_hash: [u8; 32],
        application_hash: [u8; 32],
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.admin = ctx.accounts.admin.key();
        registry.trusted_issuer_pubkey = trusted_issuer_pubkey;
        registry.partner_hash = partner_hash;
        registry.policy_hash = policy_hash;
        registry.application_hash = application_hash;
        registry.bump = ctx.bumps.registry;
        registry.registry_version = 1;
        Ok(())
    }

    pub fn register_sandbox_binding(ctx: Context<RegisterSandboxBinding>) -> Result<()> {
        let registry = &ctx.accounts.registry;
        let sandbox = &mut ctx.accounts.sandbox;
        sandbox.registry = registry.key();
        sandbox.holder = ctx.accounts.holder.key();
        sandbox.partner_hash = registry.partner_hash;
        sandbox.policy_hash = registry.policy_hash;
        sandbox.application_hash = registry.application_hash;
        sandbox.bump = ctx.bumps.sandbox;
        Ok(())
    }

    pub fn execute_harness_run(
        ctx: Context<ExecuteHarnessRun>,
        execution_nonce: u64,
        receipt_id_hash: [u8; 32],
        payload_hash: [u8; 32],
        expires_at: i64,
        status_version: u64,
    ) -> Result<()> {
        require!(execution_nonce >= 1, ProofContinuityError::InvalidVersion);
        require_keys_eq!(
            ctx.accounts.sandbox.holder,
            ctx.accounts.holder.key(),
            ProofContinuityError::UnauthorizedWallet
        );
        let ledger = &mut ctx.accounts.ledger;
        if ledger.last_execution_nonce == 0 {
            ledger.sandbox = ctx.accounts.sandbox.key();
            ledger.bump = ctx.bumps.ledger;
        } else {
            require_keys_eq!(ledger.sandbox, ctx.accounts.sandbox.key(), ProofContinuityError::WrongRegistry);
        }
        require!(
            execution_nonce == ledger.last_execution_nonce.saturating_add(1),
            ProofContinuityError::ReplayRejected
        );

        let registry = &ctx.accounts.registry;
        let (pubkey, message) = verified_issuer_message(&ctx.accounts.instructions, registry)?;
        let fields = parse_commitment_message(&message)?;
        require_scope_match(registry, &fields)?;
        require!(fields.execution_nonce == execution_nonce, ProofContinuityError::VersionMismatch);
        require!(fields.receipt_id_hash == receipt_id_hash, ProofContinuityError::ReceiptMismatch);
        require!(fields.payload_hash == payload_hash, ProofContinuityError::PayloadMismatch);
        require!(fields.expires_at == expires_at, ProofContinuityError::ExpiryMismatch);
        require!(fields.status_version == status_version, ProofContinuityError::VersionMismatch);
        require!(pubkey == registry.trusted_issuer_pubkey, ProofContinuityError::WrongIssuer);
        require_eq!(status_version, 1, ProofContinuityError::InvalidVersion);

        let commitment = &mut ctx.accounts.commitment;
        require_eq!(commitment.status_version, 0, ProofContinuityError::StaleVersion);
        commitment.registry = registry.key();
        commitment.receipt_id_hash = receipt_id_hash;
        commitment.payload_hash = payload_hash;
        commitment.partner_hash = registry.partner_hash;
        commitment.policy_hash = registry.policy_hash;
        commitment.application_hash = registry.application_hash;
        commitment.expires_at = expires_at;
        commitment.status = STATUS_ACTIVE;
        commitment.status_version = status_version;
        ledger.last_execution_nonce = execution_nonce;
        Ok(())
    }

    pub fn open_receipt_commitment(
        ctx: Context<OpenReceiptCommitment>,
        receipt_id_hash: [u8; 32],
    ) -> Result<()> {
        let commitment = &mut ctx.accounts.commitment;
        commitment.registry = ctx.accounts.registry.key();
        commitment.receipt_id_hash = receipt_id_hash;
        commitment.status_version = 0;
        commitment.bump = ctx.bumps.commitment;
        Ok(())
    }

    pub fn commit_receipt(
        ctx: Context<CommitReceipt>,
        receipt_id_hash: [u8; 32],
        payload_hash: [u8; 32],
        expires_at: i64,
        status_version: u64,
        execution_nonce: u64,
    ) -> Result<()> {
        let registry = &ctx.accounts.registry;
        let (pubkey, message) = verified_issuer_message(&ctx.accounts.instructions, registry)?;
        let fields = parse_commitment_message(&message)?;
        require_scope_match(registry, &fields)?;
        require!(fields.execution_nonce == execution_nonce, ProofContinuityError::VersionMismatch);
        require!(fields.receipt_id_hash == receipt_id_hash, ProofContinuityError::ReceiptMismatch);
        require!(fields.payload_hash == payload_hash, ProofContinuityError::PayloadMismatch);
        require!(fields.expires_at == expires_at, ProofContinuityError::ExpiryMismatch);
        require!(fields.status_version == status_version, ProofContinuityError::VersionMismatch);
        require!(status_version >= 1, ProofContinuityError::InvalidVersion);
        require!(pubkey == registry.trusted_issuer_pubkey, ProofContinuityError::WrongIssuer);

        let commitment = &mut ctx.accounts.commitment;
        require_eq!(commitment.status_version, 0, ProofContinuityError::StaleVersion);
        require_eq!(status_version, 1, ProofContinuityError::InvalidVersion);
        commitment.registry = registry.key();
        commitment.receipt_id_hash = receipt_id_hash;
        commitment.payload_hash = payload_hash;
        commitment.partner_hash = registry.partner_hash;
        commitment.policy_hash = registry.policy_hash;
        commitment.application_hash = registry.application_hash;
        commitment.expires_at = expires_at;
        commitment.status = STATUS_ACTIVE;
        commitment.status_version = status_version;
        Ok(())
    }

    pub fn update_receipt_status(
        ctx: Context<UpdateReceiptStatus>,
        receipt_id_hash: [u8; 32],
        payload_hash: [u8; 32],
        status: u8,
        status_version: u64,
        expires_at: i64,
    ) -> Result<()> {
        require!(
            status == STATUS_REVOKED || status == STATUS_EXPIRED || status == STATUS_ACTIVE,
            ProofContinuityError::InvalidStatus
        );
        let registry = &ctx.accounts.registry;
        let commitment = &mut ctx.accounts.commitment;
        require_keys_eq!(commitment.registry, registry.key(), ProofContinuityError::WrongRegistry);
        require!(
            commitment.receipt_id_hash == receipt_id_hash,
            ProofContinuityError::ReceiptMismatch
        );
        require!(
            commitment.payload_hash == payload_hash,
            ProofContinuityError::TamperedReceipt
        );

        let (pubkey, message) = verified_issuer_message(&ctx.accounts.instructions, registry)?;
        let (fields, authorized_status) = parse_status_update_message(&message)?;
        require!(authorized_status == status, ProofContinuityError::StatusSignatureMismatch);
        require_scope_match(registry, &fields)?;
        require!(fields.receipt_id_hash == receipt_id_hash, ProofContinuityError::ReceiptMismatch);
        require!(fields.payload_hash == payload_hash, ProofContinuityError::PayloadMismatch);
        require!(fields.status_version == status_version, ProofContinuityError::VersionMismatch);
        require!(fields.expires_at == expires_at, ProofContinuityError::ExpiryMismatch);
        require!(pubkey == registry.trusted_issuer_pubkey, ProofContinuityError::WrongIssuer);
        require!(
            status_version > commitment.status_version,
            ProofContinuityError::StaleVersion
        );

        // Authorization for a status change cannot extend the receipt lifetime.
        require!(expires_at <= commitment.expires_at, ProofContinuityError::ExpiryExtensionRejected);
        // Terminal states must never be reopened by a later signed update.
        require!(
            commitment.status == STATUS_ACTIVE || status != STATUS_ACTIVE,
            ProofContinuityError::TerminalStatusReactivation
        );
        commitment.status = status;
        commitment.status_version = status_version;
        commitment.expires_at = expires_at;
        Ok(())
    }

    pub fn assert_receipt_commitment(
        ctx: Context<AssertReceiptCommitment>,
        receipt_id_hash: [u8; 32],
        payload_hash: [u8; 32],
        partner_hash: [u8; 32],
        policy_hash: [u8; 32],
        application_hash: [u8; 32],
    ) -> Result<()> {
        let registry = &ctx.accounts.registry;
        let commitment = &ctx.accounts.commitment;
        require_keys_eq!(commitment.registry, registry.key(), ProofContinuityError::WrongRegistry);
        require!(
            commitment.receipt_id_hash == receipt_id_hash,
            ProofContinuityError::ReceiptMismatch
        );
        require!(
            commitment.payload_hash == payload_hash,
            ProofContinuityError::TamperedReceipt
        );
        require!(
            registry.partner_hash == partner_hash && commitment.partner_hash == partner_hash,
            ProofContinuityError::PartnerMismatch
        );
        require!(
            registry.policy_hash == policy_hash && commitment.policy_hash == policy_hash,
            ProofContinuityError::PolicyMismatch
        );
        require!(
            registry.application_hash == application_hash
                && commitment.application_hash == application_hash,
            ProofContinuityError::ApplicationMismatch
        );
        require!(
            commitment.status == STATUS_ACTIVE,
            ProofContinuityError::NotAcceptable
        );
        let now = Clock::get()?.unix_timestamp;
        require!(commitment.expires_at > now, ProofContinuityError::Expired);
        Ok(())
    }
}

fn verified_issuer_message(
    instructions: &AccountInfo<'_>,
    registry: &ProofContinuityRegistry,
) -> Result<([u8; 32], Vec<u8>)> {
    let ix_sysvar = instructions.to_account_info();
    let current = load_current_index_checked(&ix_sysvar)?;
    require!(current > 0, ProofContinuityError::MissingEd25519Instruction);
    let prior = load_instruction_at_checked((current as usize).saturating_sub(1), &ix_sysvar)?;
    require_keys_eq!(
        prior.program_id,
        ed25519_program::ID,
        ProofContinuityError::WrongPriorInstruction
    );
    let (pubkey, message) = extract_ed25519_pubkey_and_message(&prior.data)
        .map_err(|_| ProofContinuityError::InvalidMessage)?;
    require!(
        pubkey == registry.trusted_issuer_pubkey,
        ProofContinuityError::WrongIssuer
    );
    Ok((pubkey, message))
}

#[derive(Clone, Copy)]
struct CommitmentMessageFields {
    receipt_id_hash: [u8; 32],
    payload_hash: [u8; 32],
    partner_hash: [u8; 32],
    policy_hash: [u8; 32],
    application_hash: [u8; 32],
    expires_at: i64,
    status_version: u64,
    execution_nonce: u64,
}

fn parse_commitment_message(message: &[u8]) -> Result<CommitmentMessageFields> {
    require!(
        message.len() == COMMITMENT_MESSAGE_LEN,
        ProofContinuityError::InvalidMessage
    );
    let prefix_len = PROOF_CONTINUITY_PREFIX.len();
    require!(
        message.len() >= prefix_len && &message[..prefix_len] == PROOF_CONTINUITY_PREFIX,
        ProofContinuityError::InvalidMessage
    );
    let mut off = prefix_len;
    let receipt_id_hash = copy32(&message[off..off + 32]);
    off += 32;
    let payload_hash = copy32(&message[off..off + 32]);
    off += 32;
    let partner_hash = copy32(&message[off..off + 32]);
    off += 32;
    let policy_hash = copy32(&message[off..off + 32]);
    off += 32;
    let application_hash = copy32(&message[off..off + 32]);
    off += 32;
    let expires_at = i64::from_be_bytes(message[off..off + 8].try_into().unwrap());
    off += 8;
    let status_version = u64::from_be_bytes(message[off..off + 8].try_into().unwrap());
    off += 8;
    let execution_nonce = u64::from_be_bytes(message[off..off + 8].try_into().unwrap());
    Ok(CommitmentMessageFields {
        receipt_id_hash,
        payload_hash,
        partner_hash,
        policy_hash,
        application_hash,
        expires_at,
        status_version,
        execution_nonce,
    })
}

/// Require the issuer to sign the requested status under a separate domain.
fn parse_status_update_message(message: &[u8]) -> Result<(CommitmentMessageFields, u8)> {
    require!(
        message.len() == STATUS_UPDATE_MESSAGE_LEN,
        ProofContinuityError::InvalidMessage
    );
    require!(
        message.starts_with(STATUS_UPDATE_PREFIX),
        ProofContinuityError::InvalidMessage
    );
    let status = *message.last().ok_or(ProofContinuityError::InvalidMessage)?;
    let mut canonical = Vec::with_capacity(COMMITMENT_MESSAGE_LEN);
    canonical.extend_from_slice(PROOF_CONTINUITY_PREFIX);
    canonical.extend_from_slice(
        &message[STATUS_UPDATE_PREFIX.len()..message.len() - 1]
    );
    Ok((parse_commitment_message(&canonical)?, status))
}

fn require_scope_match(
    registry: &ProofContinuityRegistry,
    fields: &CommitmentMessageFields,
) -> Result<()> {
    require!(
        fields.partner_hash == registry.partner_hash,
        ProofContinuityError::PartnerMismatch
    );
    require!(
        fields.policy_hash == registry.policy_hash,
        ProofContinuityError::PolicyMismatch
    );
    require!(
        fields.application_hash == registry.application_hash,
        ProofContinuityError::ApplicationMismatch
    );
    Ok(())
}

fn copy32(slice: &[u8]) -> [u8; 32] {
    let mut out = [0u8; 32];
    out.copy_from_slice(slice);
    out
}

#[account]
#[derive(InitSpace)]
pub struct ProofContinuityRegistry {
    pub admin: Pubkey,
    pub trusted_issuer_pubkey: [u8; 32],
    pub partner_hash: [u8; 32],
    pub policy_hash: [u8; 32],
    pub application_hash: [u8; 32],
    pub registry_version: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ReceiptCommitment {
    pub registry: Pubkey,
    pub receipt_id_hash: [u8; 32],
    pub payload_hash: [u8; 32],
    pub partner_hash: [u8; 32],
    pub policy_hash: [u8; 32],
    pub application_hash: [u8; 32],
    pub expires_at: i64,
    pub status: u8,
    pub status_version: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SandboxBinding {
    pub registry: Pubkey,
    pub holder: Pubkey,
    pub partner_hash: [u8; 32],
    pub policy_hash: [u8; 32],
    pub application_hash: [u8; 32],
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ExecutionLedger {
    pub sandbox: Pubkey,
    pub last_execution_nonce: u64,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct InitializeProofRegistry<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + ProofContinuityRegistry::INIT_SPACE,
        seeds = [REGISTRY_SEED, admin.key().as_ref()],
        bump
    )]
    pub registry: Account<'info, ProofContinuityRegistry>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterSandboxBinding<'info> {
    #[account(mut)]
    pub holder: Signer<'info>,
    #[account(
        seeds = [REGISTRY_SEED, registry.admin.as_ref()],
        bump = registry.bump
    )]
    pub registry: Account<'info, ProofContinuityRegistry>,
    #[account(
        init,
        payer = holder,
        space = 8 + SandboxBinding::INIT_SPACE,
        seeds = [SANDBOX_BINDING_SEED, registry.key().as_ref(), holder.key().as_ref()],
        bump
    )]
    pub sandbox: Account<'info, SandboxBinding>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(execution_nonce: u64, receipt_id_hash: [u8; 32])]
pub struct ExecuteHarnessRun<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub holder: Signer<'info>,
    #[account(
        seeds = [REGISTRY_SEED, registry.admin.as_ref()],
        bump = registry.bump
    )]
    pub registry: Account<'info, ProofContinuityRegistry>,
    #[account(
        seeds = [SANDBOX_BINDING_SEED, registry.key().as_ref(), holder.key().as_ref()],
        bump = sandbox.bump,
        constraint = sandbox.holder == holder.key() @ ProofContinuityError::UnauthorizedWallet,
    )]
    pub sandbox: Account<'info, SandboxBinding>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + ExecutionLedger::INIT_SPACE,
        seeds = [EXECUTION_LEDGER_SEED, sandbox.key().as_ref()],
        bump
    )]
    pub ledger: Account<'info, ExecutionLedger>,
    #[account(
        init,
        payer = payer,
        space = 8 + ReceiptCommitment::INIT_SPACE,
        seeds = [
            COMMITMENT_SEED,
            registry.key().as_ref(),
            receipt_id_hash.as_ref()
        ],
        bump
    )]
    pub commitment: Account<'info, ReceiptCommitment>,
    /// CHECK: instructions sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(receipt_id_hash: [u8; 32])]
pub struct OpenReceiptCommitment<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        seeds = [REGISTRY_SEED, registry.admin.as_ref()],
        bump = registry.bump,
        constraint = registry.admin == payer.key() @ ProofContinuityError::UnauthorizedRegistryAdmin
    )]
    pub registry: Account<'info, ProofContinuityRegistry>,
    #[account(
        init,
        payer = payer,
        space = 8 + ReceiptCommitment::INIT_SPACE,
        seeds = [
            COMMITMENT_SEED,
            registry.key().as_ref(),
            receipt_id_hash.as_ref()
        ],
        bump
    )]
    pub commitment: Account<'info, ReceiptCommitment>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(receipt_id_hash: [u8; 32], execution_nonce: u64)]
pub struct CommitReceipt<'info> {
    pub committer: Signer<'info>,
    #[account(
        seeds = [REGISTRY_SEED, registry.admin.as_ref()],
        bump = registry.bump
    )]
    pub registry: Account<'info, ProofContinuityRegistry>,
    #[account(
        mut,
        seeds = [
            COMMITMENT_SEED,
            registry.key().as_ref(),
            receipt_id_hash.as_ref()
        ],
        bump = commitment.bump,
        constraint = commitment.registry == registry.key() @ ProofContinuityError::WrongRegistry,
    )]
    pub commitment: Account<'info, ReceiptCommitment>,
    /// CHECK: instructions sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(receipt_id_hash: [u8; 32])]
pub struct UpdateReceiptStatus<'info> {
    pub operator: Signer<'info>,
    #[account(
        seeds = [REGISTRY_SEED, registry.admin.as_ref()],
        bump = registry.bump
    )]
    pub registry: Account<'info, ProofContinuityRegistry>,
    #[account(
        mut,
        seeds = [
            COMMITMENT_SEED,
            registry.key().as_ref(),
            receipt_id_hash.as_ref()
        ],
        bump = commitment.bump
    )]
    pub commitment: Account<'info, ReceiptCommitment>,
    /// CHECK: instructions sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(receipt_id_hash: [u8; 32])]
pub struct AssertReceiptCommitment<'info> {
    #[account(
        seeds = [REGISTRY_SEED, registry.admin.as_ref()],
        bump = registry.bump
    )]
    pub registry: Account<'info, ProofContinuityRegistry>,
    #[account(
        seeds = [
            COMMITMENT_SEED,
            registry.key().as_ref(),
            receipt_id_hash.as_ref()
        ],
        bump = commitment.bump
    )]
    pub commitment: Account<'info, ReceiptCommitment>,
}

#[error_code]
pub enum ProofContinuityError {
    #[msg("missing_ed25519_instruction")]
    MissingEd25519Instruction,
    #[msg("wrong_prior_instruction")]
    WrongPriorInstruction,
    #[msg("invalid_message")]
    InvalidMessage,
    #[msg("wrong_issuer")]
    WrongIssuer,
    #[msg("partner_mismatch")]
    PartnerMismatch,
    #[msg("policy_mismatch")]
    PolicyMismatch,
    #[msg("application_mismatch")]
    ApplicationMismatch,
    #[msg("receipt_mismatch")]
    ReceiptMismatch,
    #[msg("payload_mismatch")]
    PayloadMismatch,
    #[msg("expiry_mismatch")]
    ExpiryMismatch,
    #[msg("version_mismatch")]
    VersionMismatch,
    #[msg("invalid_version")]
    InvalidVersion,
    #[msg("stale_version")]
    StaleVersion,
    #[msg("tampered_receipt")]
    TamperedReceipt,
    #[msg("wrong_registry")]
    WrongRegistry,
    #[msg("invalid_status")]
    InvalidStatus,
    #[msg("status_signature_mismatch")]
    StatusSignatureMismatch,
    #[msg("terminal_status_reactivation")]
    TerminalStatusReactivation,
    #[msg("expiry_extension_rejected")]
    ExpiryExtensionRejected,
    #[msg("not_acceptable")]
    NotAcceptable,
    #[msg("expired")]
    Expired,
    #[msg("unauthorized_wallet")]
    UnauthorizedWallet,
    #[msg("unauthorized_registry_admin")]
    UnauthorizedRegistryAdmin,
    #[msg("replay_rejected")]
    ReplayRejected,
}