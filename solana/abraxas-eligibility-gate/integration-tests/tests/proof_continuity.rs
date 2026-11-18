use abraxas_proof_continuity::{
    COMMITMENT_MESSAGE_LEN, COMMITMENT_SEED, ID as PROOF_ID, PROOF_CONTINUITY_PREFIX, REGISTRY_SEED,
    STATUS_ACTIVE, STATUS_EXPIRED, STATUS_REVOKED, STATUS_UPDATE_PREFIX,
};
use anchor_lang::{InstructionData, ToAccountMetas};
use solana_program_test::{processor, BanksClientError, ProgramTest, ProgramTestContext};
use solana_sdk::{
    ed25519_program,
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
    transaction::Transaction,
};

fn h32(fill: u8) -> [u8; 32] {
    [fill; 32]
}

fn write_i64_be(buf: &mut [u8], offset: usize, value: i64) {
    buf[offset..offset + 8].copy_from_slice(&value.to_be_bytes());
}

fn write_u64_be(buf: &mut [u8], offset: usize, value: u64) {
    buf[offset..offset + 8].copy_from_slice(&value.to_be_bytes());
}

fn commitment_message(
    receipt_id_hash: [u8; 32],
    payload_hash: [u8; 32],
    partner_hash: [u8; 32],
    policy_hash: [u8; 32],
    application_hash: [u8; 32],
    expires_at: i64,
    status_version: u64,
    execution_nonce: u64,
) -> Vec<u8> {
    let mut message = vec![0u8; COMMITMENT_MESSAGE_LEN];
    message[..PROOF_CONTINUITY_PREFIX.len()].copy_from_slice(PROOF_CONTINUITY_PREFIX);
    let mut off = PROOF_CONTINUITY_PREFIX.len();
    message[off..off + 32].copy_from_slice(&receipt_id_hash);
    off += 32;
    message[off..off + 32].copy_from_slice(&payload_hash);
    off += 32;
    message[off..off + 32].copy_from_slice(&partner_hash);
    off += 32;
    message[off..off + 32].copy_from_slice(&policy_hash);
    off += 32;
    message[off..off + 32].copy_from_slice(&application_hash);
    off += 32;
    write_i64_be(&mut message, off, expires_at);
    off += 8;
    write_u64_be(&mut message, off, status_version);
    off += 8;
    write_u64_be(&mut message, off, execution_nonce);
    message
}

fn status_update_message(
    receipt_id_hash: [u8; 32],
    payload_hash: [u8; 32],
    partner_hash: [u8; 32],
    policy_hash: [u8; 32],
    application_hash: [u8; 32],
    expires_at: i64,
    status_version: u64,
    execution_nonce: u64,
    status: u8,
) -> Vec<u8> {
    let canonical = commitment_message(
        receipt_id_hash, payload_hash, partner_hash, policy_hash, application_hash,
        expires_at, status_version, execution_nonce,
    );
    let mut message = Vec::new();
    message.extend_from_slice(STATUS_UPDATE_PREFIX);
    message.extend_from_slice(&canonical[PROOF_CONTINUITY_PREFIX.len()..]);
    message.push(status);
    message
}

fn status_update_ix(
    admin: &Keypair,
    registry: Pubkey,
    commitment: Pubkey,
    receipt: [u8; 32],
    payload: [u8; 32],
    status: u8,
    version: u64,
    expires_at: i64,
) -> Instruction {
    Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::UpdateReceiptStatus {
            operator: admin.pubkey(),
            registry,
            commitment,
            instructions: solana_sdk::sysvar::instructions::id(),
        }.to_account_metas(None),
        data: abraxas_proof_continuity::instruction::UpdateReceiptStatus {
            receipt_id_hash: receipt,
            payload_hash: payload,
            status,
            status_version: version,
            expires_at,
        }.data(),
    }
}

fn ed25519_ix(signer: &Keypair, message: &[u8]) -> Instruction {
    let header_len = 16usize;
    let public_key_offset = header_len;
    let signature_offset = public_key_offset + 32;
    let message_offset = signature_offset + 64;
    let mut data = vec![0u8; message_offset + message.len()];
    data[0] = 1;
    data[2..4].copy_from_slice(&(signature_offset as u16).to_le_bytes());
    data[4..6].copy_from_slice(&0xffffu16.to_le_bytes());
    data[6..8].copy_from_slice(&(public_key_offset as u16).to_le_bytes());
    data[8..10].copy_from_slice(&0xffffu16.to_le_bytes());
    data[10..12].copy_from_slice(&(message_offset as u16).to_le_bytes());
    data[12..14].copy_from_slice(&(message.len() as u16).to_le_bytes());
    data[14..16].copy_from_slice(&0xffffu16.to_le_bytes());
    data[public_key_offset..public_key_offset + 32].copy_from_slice(&signer.pubkey().to_bytes());
    data[signature_offset..signature_offset + 64]
        .copy_from_slice(signer.sign_message(message).as_ref());
    data[message_offset..].copy_from_slice(message);
    Instruction {
        program_id: ed25519_program::id(),
        accounts: vec![],
        data,
    }
}

fn registry_pda(admin: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[REGISTRY_SEED, admin.as_ref()], &PROOF_ID)
}

fn commitment_pda(registry: &Pubkey, receipt_id_hash: &[u8; 32]) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[COMMITMENT_SEED, registry.as_ref(), receipt_id_hash.as_ref()],
        &PROOF_ID,
    )
}

fn proof_process<'a, 'b, 'c, 'd>(
    program_id: &'a Pubkey,
    accounts: &'b [solana_sdk::account_info::AccountInfo<'c>],
    data: &'d [u8],
) -> solana_sdk::entrypoint::ProgramResult {
    abraxas_proof_continuity::entry(
        unsafe { &*(program_id as *const Pubkey) },
        unsafe {
            &*(accounts as *const [solana_sdk::account_info::AccountInfo<'c>]
                as *const [solana_sdk::account_info::AccountInfo])
        },
        data,
    )
}

async fn send(
    ctx: &mut ProgramTestContext,
    ixs: Vec<Instruction>,
    extra_signers: &[&Keypair],
) -> Result<(), BanksClientError> {
    let mut signers: Vec<&Keypair> = vec![&ctx.payer];
    for signer in extra_signers {
        if signer.pubkey() != ctx.payer.pubkey() {
            signers.push(*signer);
        }
    }
    let tx = Transaction::new_signed_with_payer(
        &ixs,
        Some(&ctx.payer.pubkey()),
        &signers,
        ctx.last_blockhash,
    );
    ctx.banks_client.process_transaction(tx).await
}

async fn start() -> ProgramTestContext {
    let program_test =
        ProgramTest::new("abraxas_proof_continuity", PROOF_ID, processor!(proof_process));
    program_test.start_with_context().await
}

struct Scope {
    partner: [u8; 32],
    policy: [u8; 32],
    application: [u8; 32],
    receipt: [u8; 32],
    payload: [u8; 32],
    expires_at: i64,
}

impl Default for Scope {
    fn default() -> Self {
        Self {
            partner: h32(11),
            policy: h32(12),
            application: h32(13),
            receipt: h32(14),
            payload: h32(15),
            expires_at: 9_000_000_000,
        }
    }
}

async fn init_registry(ctx: &mut ProgramTestContext, admin: &Keypair, issuer: &Keypair, scope: &Scope) {
    let (registry, _) = registry_pda(&admin.pubkey());
    let ix = Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::InitializeProofRegistry {
            admin: admin.pubkey(),
            registry,
            system_program: system_program::id(),
        }
        .to_account_metas(None),
        data: abraxas_proof_continuity::instruction::InitializeProofRegistry {
            trusted_issuer_pubkey: issuer.pubkey().to_bytes(),
            partner_hash: scope.partner,
            policy_hash: scope.policy,
            application_hash: scope.application,
        }
        .data(),
    };
    send(ctx, vec![ix], &[admin])
        .await
        .unwrap_or_else(|e| panic!("init_registry failed: {e:?}"));
}

async fn commit_fallible(
    ctx: &mut ProgramTestContext,
    admin: &Keypair,
    issuer: &Keypair,
    committer: &Keypair,
    scope: &Scope,
    status_version: u64,
) -> Result<(), BanksClientError> {
    let (registry, _) = registry_pda(&admin.pubkey());
    let (commitment, _) = commitment_pda(&registry, &scope.receipt);
    let message = commitment_message(
        scope.receipt,
        scope.payload,
        scope.partner,
        scope.policy,
        scope.application,
        scope.expires_at,
        status_version,
        1,
    );
    let open_ix = Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::OpenReceiptCommitment {
            payer: ctx.payer.pubkey(),
            registry,
            commitment,
            system_program: system_program::id(),
        }
        .to_account_metas(None),
        data: abraxas_proof_continuity::instruction::OpenReceiptCommitment {
            receipt_id_hash: scope.receipt,
        }
        .data(),
    };
    let commit_ix = Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::CommitReceipt {
            committer: committer.pubkey(),
            registry,
            commitment,
            instructions: solana_sdk::sysvar::instructions::id(),
        }
        .to_account_metas(None),
        data: abraxas_proof_continuity::instruction::CommitReceipt {
            receipt_id_hash: scope.receipt,
            payload_hash: scope.payload,
            expires_at: scope.expires_at,
            status_version,
            execution_nonce: 1,
        }
        .data(),
    };
    send(
        ctx,
        vec![open_ix, ed25519_ix(issuer, &message), commit_ix],
        &[committer],
    )
    .await
}

async fn commit_only_fallible(
    ctx: &mut ProgramTestContext,
    admin: &Keypair,
    issuer: &Keypair,
    committer: &Keypair,
    scope: &Scope,
    status_version: u64,
) -> Result<(), BanksClientError> {
    let (registry, _) = registry_pda(&admin.pubkey());
    let (commitment, _) = commitment_pda(&registry, &scope.receipt);
    let message = commitment_message(
        scope.receipt,
        scope.payload,
        scope.partner,
        scope.policy,
        scope.application,
        scope.expires_at,
        status_version,
        1,
    );
    let commit_ix = Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::CommitReceipt {
            committer: committer.pubkey(),
            registry,
            commitment,
            instructions: solana_sdk::sysvar::instructions::id(),
        }
        .to_account_metas(None),
        data: abraxas_proof_continuity::instruction::CommitReceipt {
            receipt_id_hash: scope.receipt,
            payload_hash: scope.payload,
            expires_at: scope.expires_at,
            status_version,
            execution_nonce: 1,
        }
        .data(),
    };
    send(
        ctx,
        vec![ed25519_ix(issuer, &message), commit_ix],
        &[committer],
    )
    .await
}

async fn commit(
    ctx: &mut ProgramTestContext,
    admin: &Keypair,
    issuer: &Keypair,
    committer: &Keypair,
    scope: &Scope,
    status_version: u64,
) {
    commit_fallible(ctx, admin, issuer, committer, scope, status_version)
        .await
        .unwrap_or_else(|e| panic!("commit failed: {e:?}"));
}

#[tokio::test]
async fn wallet_authorized_commit_and_independent_assert() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let committer = Keypair::new();
    let scope = Scope::default();
    init_registry(&mut ctx, &admin, &issuer, &scope).await;
    commit(&mut ctx, &admin, &issuer, &committer, &scope, 1).await;

    let (registry, _) = registry_pda(&admin.pubkey());
    let (commitment, _) = commitment_pda(&registry, &scope.receipt);
    let ix = Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::AssertReceiptCommitment {
            registry,
            commitment,
        }
        .to_account_metas(None),
        data: abraxas_proof_continuity::instruction::AssertReceiptCommitment {
            receipt_id_hash: scope.receipt,
            payload_hash: scope.payload,
            partner_hash: scope.partner,
            policy_hash: scope.policy,
            application_hash: scope.application,
        }
        .data(),
    };
    send(&mut ctx, vec![ix], &[]).await.unwrap();
}

#[tokio::test]
async fn wrong_issuer_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let impostor = Keypair::new();
    let committer = Keypair::new();
    let scope = Scope::default();
    init_registry(&mut ctx, &admin, &issuer, &scope).await;
    assert!(
        commit_fallible(&mut ctx, &admin, &impostor, &committer, &scope, 1)
            .await
            .is_err()
    );
}

#[tokio::test]
async fn wrong_policy_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let committer = Keypair::new();
    let scope = Scope::default();
    init_registry(&mut ctx, &admin, &issuer, &scope).await;

    let mut bad = scope;
    bad.policy = h32(99);
    assert!(
        commit_fallible(&mut ctx, &admin, &issuer, &committer, &bad, 1)
            .await
            .is_err()
    );
}

#[tokio::test]
async fn duplicate_version_replay_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let committer = Keypair::new();
    let scope = Scope::default();
    init_registry(&mut ctx, &admin, &issuer, &scope).await;
    commit(&mut ctx, &admin, &issuer, &committer, &scope, 1).await;
    assert!(
        commit_only_fallible(&mut ctx, &admin, &issuer, &committer, &scope, 1)
            .await
            .is_err()
    );
}

#[tokio::test]
async fn revoked_and_expired_fail_assert() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let committer = Keypair::new();
    let scope = Scope::default();
    init_registry(&mut ctx, &admin, &issuer, &scope).await;
    commit(&mut ctx, &admin, &issuer, &committer, &scope, 1).await;

    let (registry, _) = registry_pda(&admin.pubkey());
    let (commitment, _) = commitment_pda(&registry, &scope.receipt);
    let message = status_update_message(
        scope.receipt,
        scope.payload,
        scope.partner,
        scope.policy,
        scope.application,
        scope.expires_at,
        2,
        1,
        STATUS_REVOKED,
    );
    let ix = Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::UpdateReceiptStatus {
            operator: admin.pubkey(),
            registry,
            commitment,
            instructions: solana_sdk::sysvar::instructions::id(),
        }
        .to_account_metas(None),
        data: abraxas_proof_continuity::instruction::UpdateReceiptStatus {
            receipt_id_hash: scope.receipt,
            payload_hash: scope.payload,
            status: STATUS_REVOKED,
            status_version: 2,
            expires_at: scope.expires_at,
        }
        .data(),
    };
    send(&mut ctx, vec![ed25519_ix(&issuer, &message), ix], &[&admin]).await.unwrap();

    let assert_ix = Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::AssertReceiptCommitment {
            registry,
            commitment,
        }
        .to_account_metas(None),
        data: abraxas_proof_continuity::instruction::AssertReceiptCommitment {
            receipt_id_hash: scope.receipt,
            payload_hash: scope.payload,
            partner_hash: scope.partner,
            policy_hash: scope.policy,
            application_hash: scope.application,
        }
        .data(),
    };
    assert!(send(&mut ctx, vec![assert_ix.clone()], &[]).await.is_err());

    let message_exp = status_update_message(
        scope.receipt,
        scope.payload,
        scope.partner,
        scope.policy,
        scope.application,
        1,
        3,
        1,
        STATUS_EXPIRED,
    );
    let update_exp = Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::UpdateReceiptStatus {
            operator: admin.pubkey(),
            registry,
            commitment,
            instructions: solana_sdk::sysvar::instructions::id(),
        }
        .to_account_metas(None),
        data: abraxas_proof_continuity::instruction::UpdateReceiptStatus {
            receipt_id_hash: scope.receipt,
            payload_hash: scope.payload,
            status: STATUS_EXPIRED,
            status_version: 3,
            expires_at: 1,
        }
        .data(),
    };
    send(&mut ctx, vec![ed25519_ix(&issuer, &message_exp), update_exp], &[&admin])
        .await
        .unwrap();

    let mut clock = ctx.banks_client.get_sysvar::<solana_sdk::clock::Clock>().await.unwrap();
    clock.unix_timestamp = 10;
    ctx.set_sysvar::<solana_sdk::clock::Clock>(&clock);
    assert!(send(&mut ctx, vec![assert_ix], &[]).await.is_err());
}

#[tokio::test]
async fn tampered_payload_on_update_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let committer = Keypair::new();
    let scope = Scope::default();
    init_registry(&mut ctx, &admin, &issuer, &scope).await;
    commit(&mut ctx, &admin, &issuer, &committer, &scope, 1).await;

    let (registry, _) = registry_pda(&admin.pubkey());
    let (commitment, _) = commitment_pda(&registry, &scope.receipt);
    let tampered = h32(77);
    let message = status_update_message(
        scope.receipt,
        tampered,
        scope.partner,
        scope.policy,
        scope.application,
        scope.expires_at,
        2,
        1,
        STATUS_REVOKED,
    );
    let ix = Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::UpdateReceiptStatus {
            operator: admin.pubkey(),
            registry,
            commitment,
            instructions: solana_sdk::sysvar::instructions::id(),
        }
        .to_account_metas(None),
        data: abraxas_proof_continuity::instruction::UpdateReceiptStatus {
            receipt_id_hash: scope.receipt,
            payload_hash: tampered,
            status: STATUS_REVOKED,
            status_version: 2,
            expires_at: scope.expires_at,
        }
        .data(),
    };
    assert!(send(&mut ctx, vec![ed25519_ix(&issuer, &message), ix], &[&admin]).await.is_err());
}

#[tokio::test]
async fn unauthorized_wallet_cannot_reserve_issuer_receipt_address() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let scope = Scope::default();
    init_registry(&mut ctx, &admin, &issuer, &scope).await;

    let unauthorized_payer = Keypair::new();
    let (registry, _) = registry_pda(&admin.pubkey());
    let (commitment, _) = commitment_pda(&registry, &scope.receipt);
    let open_ix = Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::OpenReceiptCommitment {
            payer: unauthorized_payer.pubkey(),
            registry,
            commitment,
            system_program: system_program::id(),
        }.to_account_metas(None),
        data: abraxas_proof_continuity::instruction::OpenReceiptCommitment {
            receipt_id_hash: scope.receipt,
        }.data(),
    };
    assert!(send(&mut ctx, vec![open_ix], &[&unauthorized_payer]).await.is_err());
    assert!(ctx.banks_client.get_account(commitment).await.unwrap().is_none());
}

#[tokio::test]
async fn status_change_signature_binds_requested_status() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let committer = Keypair::new();
    let scope = Scope::default();
    init_registry(&mut ctx, &admin, &issuer, &scope).await;
    commit(&mut ctx, &admin, &issuer, &committer, &scope, 1).await;

    let (registry, _) = registry_pda(&admin.pubkey());
    let (commitment, _) = commitment_pda(&registry, &scope.receipt);
    let message = status_update_message(
        scope.receipt, scope.payload, scope.partner, scope.policy, scope.application,
        scope.expires_at, 2, 1, STATUS_REVOKED,
    );
    // The issuer signed REVOKED, but the operator tries ACTIVE.
    let unauthorized = status_update_ix(
        &admin, registry, commitment, scope.receipt, scope.payload,
        STATUS_ACTIVE, 2, scope.expires_at,
    );
    assert!(send(&mut ctx, vec![ed25519_ix(&issuer, &message), unauthorized], &[&admin]).await.is_err());

    // Exactly the signed transition is authorized.
    let revoke = status_update_ix(
        &admin, registry, commitment, scope.receipt, scope.payload,
        STATUS_REVOKED, 2, scope.expires_at,
    );
    send(&mut ctx, vec![ed25519_ix(&issuer, &message), revoke], &[&admin]).await.unwrap();
}

#[tokio::test]
async fn revoked_receipt_cannot_reactivate() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let committer = Keypair::new();
    let scope = Scope::default();
    init_registry(&mut ctx, &admin, &issuer, &scope).await;
    commit(&mut ctx, &admin, &issuer, &committer, &scope, 1).await;
    let (registry, _) = registry_pda(&admin.pubkey());
    let (commitment, _) = commitment_pda(&registry, &scope.receipt);
    let revoke_msg = status_update_message(
        scope.receipt, scope.payload, scope.partner, scope.policy, scope.application,
        scope.expires_at, 2, 1, STATUS_REVOKED,
    );
    let revoke = status_update_ix(
        &admin, registry, commitment, scope.receipt, scope.payload,
        STATUS_REVOKED, 2, scope.expires_at,
    );
    send(&mut ctx, vec![ed25519_ix(&issuer, &revoke_msg), revoke], &[&admin]).await.unwrap();

    let activate_msg = status_update_message(
        scope.receipt, scope.payload, scope.partner, scope.policy, scope.application,
        scope.expires_at, 3, 1, STATUS_ACTIVE,
    );
    let activate = status_update_ix(
        &admin, registry, commitment, scope.receipt, scope.payload,
        STATUS_ACTIVE, 3, scope.expires_at,
    );
    assert!(send(&mut ctx, vec![ed25519_ix(&issuer, &activate_msg), activate], &[&admin]).await.is_err());
}

#[tokio::test]
async fn status_update_cannot_extend_receipt_expiry() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let committer = Keypair::new();
    let scope = Scope::default();
    init_registry(&mut ctx, &admin, &issuer, &scope).await;
    commit(&mut ctx, &admin, &issuer, &committer, &scope, 1).await;
    let (registry, _) = registry_pda(&admin.pubkey());
    let (commitment, _) = commitment_pda(&registry, &scope.receipt);
    let later = scope.expires_at + 100;
    let message = status_update_message(
        scope.receipt, scope.payload, scope.partner, scope.policy, scope.application,
        later, 2, 1, STATUS_REVOKED,
    );
    let update = status_update_ix(
        &admin, registry, commitment, scope.receipt, scope.payload,
        STATUS_REVOKED, 2, later,
    );
    assert!(send(&mut ctx, vec![ed25519_ix(&issuer, &message), update], &[&admin]).await.is_err());
}

#[tokio::test]
async fn missing_chain_state_fails_assert() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let scope = Scope::default();
    let (registry, _) = registry_pda(&admin.pubkey());
    let (commitment, _) = commitment_pda(&registry, &scope.receipt);
    let ix = Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::AssertReceiptCommitment {
            registry,
            commitment,
        }
        .to_account_metas(None),
        data: abraxas_proof_continuity::instruction::AssertReceiptCommitment {
            receipt_id_hash: scope.receipt,
            payload_hash: scope.payload,
            partner_hash: scope.partner,
            policy_hash: scope.policy,
            application_hash: scope.application,
        }
        .data(),
    };
    assert!(send(&mut ctx, vec![ix], &[]).await.is_err());
}