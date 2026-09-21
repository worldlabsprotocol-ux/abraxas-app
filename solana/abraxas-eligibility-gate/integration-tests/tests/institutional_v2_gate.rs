use abraxas_eligibility_consumer::ID as CONSUMER_ID;
use abraxas_eligibility_gate::canonical::{
    prefix_keccak, prefix_v1_keccak, AUTH_SEED, CANONICAL_MESSAGE_LEN, CONFIG_SEED,
    CONSUMER_AUTH_SEED, LEGACY_V1_MESSAGE_LEN, OFF_ACTION, OFF_ATTESTATION_ID, OFF_CATEGORY,
    OFF_ENVIRONMENT, OFF_EXPIRES, OFF_ISSUED, OFF_NETWORK, OFF_NONCE, OFF_ORG, OFF_ACTOR,
    OFF_PARTNER, OFF_POLICY, OFF_PREFIX, OFF_PREFIX_HASH, OFF_SCHEMA, OFF_SIGNER_KEY_ID,
    OFF_SUBJECT, PREFIX, PREFIX_V1, RESULT_SEED,
};
use abraxas_eligibility_gate::institutional_v2::deployed_institutional_capable;
use abraxas_eligibility_gate::{ConfigParams, ID as GATE_ID};
use anchor_lang::{system_program, InstructionData, ToAccountMetas};
use solana_program_test::{processor, BanksClientError, ProgramTest, ProgramTestContext};
use solana_sdk::{
    account_info::AccountInfo,
    clock::Clock,
    ed25519_program,
    entrypoint::ProgramResult,
    instruction::{Instruction, InstructionError},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::{Transaction, TransactionError},
};

fn h32(fill: u8) -> [u8; 32] {
    [fill; 32]
}

fn write_u64_be(buf: &mut [u8], offset: usize, value: u64) {
    buf[offset..offset + 8].copy_from_slice(&value.to_be_bytes());
}

#[derive(Clone, Copy)]
struct MessageFields {
    network_id: [u8; 32],
    partner_hash: [u8; 32],
    policy_hash: [u8; 32],
    action_hash: [u8; 32],
    subject_hash: [u8; 32],
    issued_at: u64,
    expires_at: u64,
    nonce: [u8; 32],
    attestation_id: [u8; 32],
    environment: [u8; 32],
    signer_key_id: [u8; 32],
    organization_commitment: [u8; 32],
    actor_commitment: [u8; 32],
    institutional_result_category: [u8; 32],
}

impl Default for MessageFields {
    fn default() -> Self {
        Self {
            network_id: h32(11),
            partner_hash: h32(12),
            policy_hash: h32(13),
            action_hash: h32(14),
            subject_hash: h32(15),
            issued_at: 1_000,
            expires_at: 2_000_000_000,
            nonce: h32(16),
            attestation_id: h32(17),
            environment: h32(18),
            signer_key_id: h32(19),
            organization_commitment: h32(31),
            actor_commitment: h32(32),
            institutional_result_category: h32(33),
        }
    }
}

fn v2_message(fields: MessageFields) -> Vec<u8> {
    let mut message = vec![0u8; CANONICAL_MESSAGE_LEN];
    message[OFF_PREFIX..OFF_PREFIX_HASH].copy_from_slice(PREFIX);
    message[OFF_PREFIX_HASH..OFF_SCHEMA].copy_from_slice(&prefix_keccak());
    write_u64_be(&mut message, OFF_SCHEMA, 2);
    message[OFF_NETWORK..OFF_PARTNER].copy_from_slice(&fields.network_id);
    message[OFF_PARTNER..OFF_POLICY].copy_from_slice(&fields.partner_hash);
    message[OFF_POLICY..OFF_ACTION].copy_from_slice(&fields.policy_hash);
    message[OFF_ACTION..OFF_SUBJECT].copy_from_slice(&fields.action_hash);
    message[OFF_SUBJECT..OFF_ISSUED].copy_from_slice(&fields.subject_hash);
    write_u64_be(&mut message, OFF_ISSUED, fields.issued_at);
    write_u64_be(&mut message, OFF_EXPIRES, fields.expires_at);
    message[OFF_NONCE..OFF_ATTESTATION_ID].copy_from_slice(&fields.nonce);
    message[OFF_ATTESTATION_ID..OFF_ENVIRONMENT].copy_from_slice(&fields.attestation_id);
    message[OFF_ENVIRONMENT..OFF_SIGNER_KEY_ID].copy_from_slice(&fields.environment);
    message[OFF_SIGNER_KEY_ID..OFF_ORG].copy_from_slice(&fields.signer_key_id);
    message[OFF_ORG..OFF_ACTOR].copy_from_slice(&fields.organization_commitment);
    message[OFF_ACTOR..OFF_CATEGORY].copy_from_slice(&fields.actor_commitment);
    message[OFF_CATEGORY..CANONICAL_MESSAGE_LEN]
        .copy_from_slice(&fields.institutional_result_category);
    message
}

fn v1_message(fields: MessageFields) -> Vec<u8> {
    let mut message = vec![0u8; LEGACY_V1_MESSAGE_LEN];
    message[OFF_PREFIX..OFF_PREFIX_HASH].copy_from_slice(PREFIX_V1);
    message[OFF_PREFIX_HASH..OFF_SCHEMA].copy_from_slice(&prefix_v1_keccak());
    write_u64_be(&mut message, OFF_SCHEMA, 1);
    message[OFF_NETWORK..OFF_PARTNER].copy_from_slice(&fields.network_id);
    message[OFF_PARTNER..OFF_POLICY].copy_from_slice(&fields.partner_hash);
    message[OFF_POLICY..OFF_ACTION].copy_from_slice(&fields.policy_hash);
    message[OFF_ACTION..OFF_SUBJECT].copy_from_slice(&fields.action_hash);
    message[OFF_SUBJECT..OFF_ISSUED].copy_from_slice(&fields.subject_hash);
    write_u64_be(&mut message, OFF_ISSUED, fields.issued_at);
    write_u64_be(&mut message, OFF_EXPIRES, fields.expires_at);
    message[OFF_NONCE..OFF_ATTESTATION_ID].copy_from_slice(&fields.nonce);
    message[OFF_ATTESTATION_ID..OFF_ENVIRONMENT].copy_from_slice(&fields.attestation_id);
    message[OFF_ENVIRONMENT..OFF_SIGNER_KEY_ID].copy_from_slice(&fields.environment);
    message[OFF_SIGNER_KEY_ID..LEGACY_V1_MESSAGE_LEN].copy_from_slice(&fields.signer_key_id);
    message
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

fn config_pda(admin: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[CONFIG_SEED, admin.as_ref()], &GATE_ID)
}

fn auth_pda(config: &Pubkey, attestation_id: &[u8; 32]) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[AUTH_SEED, config.as_ref(), attestation_id], &GATE_ID)
}

fn consumer_auth_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[CONSUMER_AUTH_SEED], &CONSUMER_ID)
}

fn result_pda(authorization: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[RESULT_SEED, authorization.as_ref()], &CONSUMER_ID)
}

fn institutional_params(trusted_signer: [u8; 32], fields: MessageFields) -> ConfigParams {
    ConfigParams {
        partner_program: CONSUMER_ID,
        trusted_signer,
        network_id: fields.network_id,
        partner_hash: fields.partner_hash,
        policy_hash: fields.policy_hash,
        action_hash: fields.action_hash,
        environment: fields.environment,
        signer_key_id: fields.signer_key_id,
        require_subject: true,
        require_institutional: true,
        expected_organization_commitment: fields.organization_commitment,
        expected_actor_commitment: fields.actor_commitment,
        expected_institutional_result_category: fields.institutional_result_category,
    }
}

fn gate_process<'a, 'b, 'c, 'd>(
    program_id: &'a Pubkey,
    accounts: &'b [AccountInfo<'c>],
    data: &'d [u8],
) -> ProgramResult {
    abraxas_eligibility_gate::entry(
        unsafe { &*(program_id as *const Pubkey) },
        unsafe { &*(accounts as *const [AccountInfo<'c>] as *const [AccountInfo]) },
        data,
    )
}

fn consumer_process<'a, 'b, 'c, 'd>(
    program_id: &'a Pubkey,
    accounts: &'b [AccountInfo<'c>],
    data: &'d [u8],
) -> ProgramResult {
    abraxas_eligibility_consumer::entry(
        unsafe { &*(program_id as *const Pubkey) },
        unsafe { &*(accounts as *const [AccountInfo<'c>] as *const [AccountInfo]) },
        data,
    )
}

async fn start() -> ProgramTestContext {
    let mut program_test = ProgramTest::new("abraxas_eligibility_gate", GATE_ID, processor!(gate_process));
    program_test.add_program(
        "abraxas_eligibility_consumer",
        CONSUMER_ID,
        processor!(consumer_process),
    );
    program_test.start_with_context().await
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

async fn airdrop(ctx: &mut ProgramTestContext, user: &Keypair) {
    let from = ctx.payer.pubkey();
    let ix = solana_sdk::system_instruction::transfer(&from, &user.pubkey(), 2_000_000_000);
    send(ctx, vec![ix], &[]).await.unwrap();
}

async fn initialize(ctx: &mut ProgramTestContext, admin: &Keypair, params: ConfigParams) -> Pubkey {
    let (config, _) = config_pda(&admin.pubkey());
    let ix = Instruction {
        program_id: GATE_ID,
        accounts: abraxas_eligibility_gate::accounts::InitializeConfig {
            admin: admin.pubkey(),
            config,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: abraxas_eligibility_gate::instruction::InitializeConfig { params }.data(),
    };
    send(ctx, vec![ix], &[admin]).await.unwrap();
    config
}

fn authorize_ix(payer: Pubkey, config: Pubkey, attestation_id: [u8; 32]) -> Instruction {
    let (authorization, _) = auth_pda(&config, &attestation_id);
    Instruction {
        program_id: GATE_ID,
        accounts: abraxas_eligibility_gate::accounts::Authorize {
            payer,
            config,
            instructions: solana_sdk::sysvar::instructions::id(),
            authorization,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: abraxas_eligibility_gate::instruction::Authorize { attestation_id }.data(),
    }
}

fn consume_ix(payer: Pubkey, config: Pubkey, attestation_id: [u8; 32]) -> Instruction {
    let (authorization, _) = auth_pda(&config, &attestation_id);
    let (consumer_authority, _) = consumer_auth_pda();
    let (result, _) = result_pda(&authorization);
    Instruction {
        program_id: CONSUMER_ID,
        accounts: abraxas_eligibility_consumer::accounts::RecordNamedAction {
            payer,
            gate_program: GATE_ID,
            config,
            authorization,
            partner_program: CONSUMER_ID,
            consumer_authority,
            result,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: abraxas_eligibility_consumer::instruction::RecordNamedAction {}.data(),
    }
}

fn custom_code(err: &BanksClientError) -> Option<u32> {
    match err {
        BanksClientError::TransactionError(TransactionError::InstructionError(
            _,
            InstructionError::Custom(code),
        )) => Some(*code),
        _ => None,
    }
}

async fn refresh(ctx: &mut ProgramTestContext) {
    let slot = ctx.banks_client.get_root_slot().await.unwrap();
    ctx.warp_to_slot(slot + 2).unwrap();
    ctx.last_blockhash = ctx.banks_client.get_latest_blockhash().await.unwrap();
}

async fn set_clock(ctx: &mut ProgramTestContext, unix_timestamp: i64) {
    let mut clock: Clock = ctx.banks_client.get_sysvar().await.unwrap();
    clock.unix_timestamp = unix_timestamp;
    ctx.set_sysvar(&clock);
}

async fn authorize(
    ctx: &mut ProgramTestContext,
    signer: &Keypair,
    config: Pubkey,
    fields: MessageFields,
) -> Result<(), BanksClientError> {
    let payer = ctx.payer.pubkey();
    send(
        ctx,
        vec![
            ed25519_ix(signer, &v2_message(fields)),
            authorize_ix(payer, config, fields.attestation_id),
        ],
        &[],
    )
    .await
}

#[tokio::test]
async fn valid_v2_institutional_authorize_then_consume() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize(&mut ctx, &admin, institutional_params(signer.pubkey().to_bytes(), fields)).await;
    assert!(deployed_institutional_capable(true, 2, CANONICAL_MESSAGE_LEN));
    authorize(&mut ctx, &signer, config, fields).await.unwrap();
    let payer = ctx.payer.pubkey();
    send(&mut ctx, vec![consume_ix(payer, config, fields.attestation_id)], &[])
        .await
        .unwrap();
}

#[tokio::test]
async fn v1_rejected_by_institutional_required_config() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize(&mut ctx, &admin, institutional_params(signer.pubkey().to_bytes(), fields)).await;
    let payer = ctx.payer.pubkey();
    let err = send(
        &mut ctx,
        vec![
            ed25519_ix(&signer, &v1_message(fields)),
            authorize_ix(payer, config, fields.attestation_id),
        ],
        &[],
    )
    .await
    .unwrap_err();
    assert_eq!(custom_code(&err), Some(6000 + 12));
}

#[tokio::test]
async fn organization_commitment_mismatch() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize(&mut ctx, &admin, institutional_params(signer.pubkey().to_bytes(), fields)).await;
    let mut bad = fields;
    bad.organization_commitment = h32(99);
    let err = authorize(&mut ctx, &signer, config, bad).await.unwrap_err();
    assert_eq!(custom_code(&err), Some(6000 + 17));
}

#[tokio::test]
async fn actor_commitment_mismatch() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize(&mut ctx, &admin, institutional_params(signer.pubkey().to_bytes(), fields)).await;
    let mut bad = fields;
    bad.actor_commitment = h32(98);
    let err = authorize(&mut ctx, &signer, config, bad).await.unwrap_err();
    assert_eq!(custom_code(&err), Some(6000 + 18));
}

#[tokio::test]
async fn result_category_mismatch() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize(&mut ctx, &admin, institutional_params(signer.pubkey().to_bytes(), fields)).await;
    let mut bad = fields;
    bad.institutional_result_category = h32(97);
    let err = authorize(&mut ctx, &signer, config, bad).await.unwrap_err();
    assert_eq!(custom_code(&err), Some(6000 + 19));
}

#[tokio::test]
async fn expired_v2_institutional_authorization() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let mut fields = MessageFields::default();
    fields.issued_at = 1;
    fields.expires_at = 50;
    let config = initialize(&mut ctx, &admin, institutional_params(signer.pubkey().to_bytes(), fields)).await;
    set_clock(&mut ctx, 100).await;
    let err = authorize(&mut ctx, &signer, config, fields).await.unwrap_err();
    assert_eq!(custom_code(&err), Some(6000 + 13));
}

#[tokio::test]
async fn replay_consume_after_institutional_authorize() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize(&mut ctx, &admin, institutional_params(signer.pubkey().to_bytes(), fields)).await;
    authorize(&mut ctx, &signer, config, fields).await.unwrap();
    let payer = ctx.payer.pubkey();
    send(&mut ctx, vec![consume_ix(payer, config, fields.attestation_id)], &[])
        .await
        .unwrap();
    refresh(&mut ctx).await;
    let err = send(&mut ctx, vec![consume_ix(payer, config, fields.attestation_id)], &[])
        .await
        .unwrap_err();
    assert_eq!(custom_code(&err), Some(6000 + 14));
}

#[tokio::test]
async fn wrong_signer_rejected_for_institutional_v2() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    let other = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize(&mut ctx, &admin, institutional_params(signer.pubkey().to_bytes(), fields)).await;
    let payer = ctx.payer.pubkey();
    let err = send(
        &mut ctx,
        vec![
            ed25519_ix(&other, &v2_message(fields)),
            authorize_ix(payer, config, fields.attestation_id),
        ],
        &[],
    )
    .await
    .unwrap_err();
    assert_eq!(custom_code(&err), Some(6000 + 3));
}

#[tokio::test]
async fn v1_only_config_is_not_institutional_capable() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let mut params = institutional_params(signer.pubkey().to_bytes(), fields);
    params.require_institutional = false;
    params.expected_organization_commitment = [0u8; 32];
    params.expected_actor_commitment = [0u8; 32];
    params.expected_institutional_result_category = [0u8; 32];
    initialize(&mut ctx, &admin, params).await;
    assert!(!deployed_institutional_capable(false, 1, LEGACY_V1_MESSAGE_LEN));
    assert!(!deployed_institutional_capable(false, 2, CANONICAL_MESSAGE_LEN));
}

#[tokio::test]
async fn v2_body_with_v1_prefix_is_rejected() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize(&mut ctx, &admin, institutional_params(signer.pubkey().to_bytes(), fields)).await;
    let mut message = v2_message(fields);
    message[OFF_PREFIX..OFF_PREFIX_HASH].copy_from_slice(PREFIX_V1);
    let payer = ctx.payer.pubkey();
    let err = send(
        &mut ctx,
        vec![ed25519_ix(&signer, &message), authorize_ix(payer, config, fields.attestation_id)],
        &[],
    )
    .await
    .unwrap_err();
    assert!(custom_code(&err).is_some());
}

#[tokio::test]
async fn zero_issued_at_and_zero_network_rejected() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let mut fields = MessageFields::default();
    fields.issued_at = 0;
    let config = initialize(&mut ctx, &admin, institutional_params(signer.pubkey().to_bytes(), fields)).await;
    let err = authorize(&mut ctx, &signer, config, fields).await.unwrap_err();
    assert!(custom_code(&err).is_some());
}

#[tokio::test]
async fn appended_v2_bytes_rejected() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize(&mut ctx, &admin, institutional_params(signer.pubkey().to_bytes(), fields)).await;
    let mut message = v2_message(fields);
    message.push(0);
    let payer = ctx.payer.pubkey();
    let err = send(
        &mut ctx,
        vec![ed25519_ix(&signer, &message), authorize_ix(payer, config, fields.attestation_id)],
        &[],
    )
    .await
    .unwrap_err();
    assert!(custom_code(&err).is_some());
}

#[tokio::test]
async fn structured_v2_gateconfig_observation_layout() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize(&mut ctx, &admin, institutional_params(signer.pubkey().to_bytes(), fields)).await;
    let account = ctx.banks_client.get_account(config).await.unwrap().unwrap();
    assert_eq!(account.owner, GATE_ID);
    let derived = config_pda(&admin.pubkey()).0;
    assert_eq!(config, derived);
    assert!(account.data.len() > 234);
    assert_eq!(account.data[233], 1);
    assert!(deployed_institutional_capable(account.data[233] == 1, 2, 468));
    let expected_disc = solana_sdk::hash::hash(b"account:GateConfig");
    assert_eq!(&account.data[..8], &expected_disc.to_bytes()[..8]);
}

#[tokio::test]
async fn v1_only_config_is_not_institutional_capable() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let mut params = institutional_params(signer.pubkey().to_bytes(), fields);
    params.require_institutional = false;
    let config = initialize(&mut ctx, &admin, params).await;
    let account = ctx.banks_client.get_account(config).await.unwrap().unwrap();
    assert_eq!(account.data[233], 0);
    assert!(!deployed_institutional_capable(false, 1, 372));
    assert!(!deployed_institutional_capable(account.data[233] == 1, 2, 468));
}

#[test]
fn programs_have_no_token_transfer_wallet_or_arbitrary_cpi() {
    let gate = include_str!("../../programs/abraxas-eligibility-gate/src/lib.rs");
    let consumer = include_str!("../../programs/abraxas-eligibility-consumer/src/lib.rs");
    let protocol = include_str!("../../programs/abraxas-protocol-access/src/lib.rs");
    for src in [gate, consumer, protocol] {
        assert!(!src.contains("spl_token"));
        assert!(!src.contains("token::"));
        assert!(!src.contains("transfer(") || src.contains("Never transfers"));
        assert!(!src.contains("invoke("));
        assert!(!src.to_lowercase().contains("spl-token"));
        assert!(!src.contains("Tokenkeg"));
    }
}
