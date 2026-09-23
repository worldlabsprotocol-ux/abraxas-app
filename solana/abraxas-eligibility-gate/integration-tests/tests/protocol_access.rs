use abraxas_eligibility_gate::canonical::{
    prefix_keccak, AUTH_SEED, CANONICAL_MESSAGE_LEN, CONFIG_SEED, CONSUMER_AUTH_SEED, OFF_ACTION,
    OFF_ATTESTATION_ID, OFF_ENVIRONMENT, OFF_EXPIRES, OFF_ISSUED, OFF_NETWORK, OFF_NONCE, OFF_PARTNER,
    OFF_POLICY, OFF_PREFIX, OFF_PREFIX_HASH, OFF_SCHEMA, OFF_SIGNER_KEY_ID, OFF_SUBJECT, OFF_ORG,
    OFF_ACTOR, OFF_CATEGORY, PREFIX,
};
use abraxas_eligibility_gate::{ConfigParams, ID as GATE_ID};
use abraxas_protocol_access::{ENTITLEMENT_SEED, PROTOCOL_CONFIG_SEED, ID as PROTOCOL_ID};
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

fn canonical_message(fields: MessageFields) -> Vec<u8> {
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
    message[OFF_CATEGORY..CANONICAL_MESSAGE_LEN].copy_from_slice(&fields.institutional_result_category);
    message
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
            network_id: h32(21),
            partner_hash: h32(22),
            policy_hash: h32(23),
            action_hash: h32(24),
            subject_hash: h32(25),
            issued_at: 1_000,
            expires_at: 2_000_000_000,
            nonce: h32(26),
            attestation_id: h32(27),
            environment: h32(28),
            signer_key_id: h32(29),
            organization_commitment: [0u8; 32],
            actor_commitment: [0u8; 32],
            institutional_result_category: [0u8; 32],
        }
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
    data[signature_offset..signature_offset + 64].copy_from_slice(signer.sign_message(message).as_ref());
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
    Pubkey::find_program_address(&[CONSUMER_AUTH_SEED], &PROTOCOL_ID)
}

fn protocol_pda(config: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[PROTOCOL_CONFIG_SEED, config.as_ref()], &PROTOCOL_ID)
}

fn entitlement_pda(protocol: &Pubkey, subject: &[u8; 32], org: &[u8; 32]) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[ENTITLEMENT_SEED, protocol.as_ref(), subject, org], &PROTOCOL_ID)
}

fn default_params(trusted_signer: [u8; 32], fields: MessageFields) -> ConfigParams {
    ConfigParams {
        partner_program: PROTOCOL_ID,
        trusted_signer,
        network_id: fields.network_id,
        partner_hash: fields.partner_hash,
        policy_hash: fields.policy_hash,
        action_hash: fields.action_hash,
        environment: fields.environment,
        signer_key_id: fields.signer_key_id,
        require_subject: true,
        require_institutional: false,
        expected_organization_commitment: [0u8; 32],
        expected_actor_commitment: [0u8; 32],
        expected_institutional_result_category: [0u8; 32],
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

fn protocol_process<'a, 'b, 'c, 'd>(
    program_id: &'a Pubkey,
    accounts: &'b [AccountInfo<'c>],
    data: &'d [u8],
) -> ProgramResult {
    abraxas_protocol_access::entry(
        unsafe { &*(program_id as *const Pubkey) },
        unsafe { &*(accounts as *const [AccountInfo<'c>] as *const [AccountInfo]) },
        data,
    )
}

async fn start() -> ProgramTestContext {
    let mut program_test = ProgramTest::new("abraxas_eligibility_gate", GATE_ID, processor!(gate_process));
    program_test.add_program("abraxas_protocol_access", PROTOCOL_ID, processor!(protocol_process));
    program_test.start_with_context().await
}

async fn initialize_gate(ctx: &mut ProgramTestContext, admin: &Keypair, params: ConfigParams) -> Pubkey {
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

async fn initialize_protocol(
    ctx: &mut ProgramTestContext,
    config: Pubkey,
    fields: MessageFields,
) -> Pubkey {
    let (protocol, _) = protocol_pda(&config);
    let payer = ctx.payer.pubkey();
    send(ctx, vec![initialize_protocol_ix(payer, config, fields)], &[]).await.unwrap();
    protocol
}

fn initialize_protocol_ix(payer: Pubkey, config: Pubkey, fields: MessageFields) -> Instruction {
    let (protocol, _) = protocol_pda(&config);
    Instruction {
        program_id: PROTOCOL_ID,
        accounts: abraxas_protocol_access::accounts::InitializeProtocolAccess {
            payer,
            config,
            protocol,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: abraxas_protocol_access::instruction::InitializeProtocolAccess {
            expected_partner_hash: fields.partner_hash,
            expected_policy_hash: fields.policy_hash,
            expected_action_hash: fields.action_hash,
            expected_environment: fields.environment,
        }
        .data(),
    }
}

#[tokio::test]
async fn mismatched_initializer_cannot_squat_protocol_config() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize_gate(&mut ctx, &admin, default_params(signer.pubkey().to_bytes(), fields)).await;
    let payer = ctx.payer.pubkey();
    let mut wrong = fields;
    wrong.partner_hash = h32(1);
    assert!(custom_code(&send(&mut ctx, vec![initialize_protocol_ix(payer, config, wrong)], &[]).await.unwrap_err()).is_some());
    wrong = fields;
    wrong.policy_hash = h32(2);
    assert!(custom_code(&send(&mut ctx, vec![initialize_protocol_ix(payer, config, wrong)], &[]).await.unwrap_err()).is_some());
    wrong = fields;
    wrong.action_hash = h32(3);
    assert!(custom_code(&send(&mut ctx, vec![initialize_protocol_ix(payer, config, wrong)], &[]).await.unwrap_err()).is_some());
    wrong = fields;
    wrong.environment = h32(4);
    assert!(custom_code(&send(&mut ctx, vec![initialize_protocol_ix(payer, config, wrong)], &[]).await.unwrap_err()).is_some());
    let (protocol, _) = protocol_pda(&config);
    assert!(ctx.banks_client.get_account(protocol).await.unwrap().is_none());
    initialize_protocol(&mut ctx, config, fields).await;
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

fn activate_ix(payer: Pubkey, config: Pubkey, protocol: Pubkey, fields: MessageFields) -> Instruction {
    let (authorization, _) = auth_pda(&config, &fields.attestation_id);
    let (consumer_authority, _) = consumer_auth_pda();
    let (entitlement, _) = entitlement_pda(&protocol, &fields.subject_hash, &fields.organization_commitment);
    Instruction {
        program_id: PROTOCOL_ID,
        accounts: abraxas_protocol_access::accounts::ActivateProtocolAccess {
            payer,
            gate_program: GATE_ID,
            config,
            authorization,
            partner_program: PROTOCOL_ID,
            consumer_authority,
            protocol,
            entitlement,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: abraxas_protocol_access::instruction::ActivateProtocolAccess {
            subject_hash: fields.subject_hash,
            organization_commitment: fields.organization_commitment,
        }
        .data(),
    }
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

fn mutate_signer_ix(admin: Pubkey, config: Pubkey, data: Vec<u8>) -> Instruction {
    Instruction {
        program_id: GATE_ID,
        accounts: abraxas_eligibility_gate::accounts::MutateSigner { admin, config }.to_account_metas(None),
        data,
    }
}

async fn airdrop(ctx: &mut ProgramTestContext, user: &Keypair) {
    let from = ctx.payer.pubkey();
    let ix = solana_sdk::system_instruction::transfer(&from, &user.pubkey(), 2_000_000_000);
    send(ctx, vec![ix], &[]).await.unwrap();
}

async fn authorize(ctx: &mut ProgramTestContext, signer: &Keypair, config: Pubkey, fields: MessageFields) {
    let message = canonical_message(fields);
    let payer = ctx.payer.pubkey();
    send(
        ctx,
        vec![ed25519_ix(signer, &message), authorize_ix(payer, config, fields.attestation_id)],
        &[],
    )
    .await
    .unwrap();
}

#[tokio::test]
async fn presentation_shaped_message_then_access_once() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize_gate(&mut ctx, &admin, default_params(signer.pubkey().to_bytes(), fields)).await;
    let protocol = initialize_protocol(&mut ctx, config, fields).await;
    authorize(&mut ctx, &signer, config, fields).await;
    let payer = ctx.payer.pubkey();
    send(&mut ctx, vec![activate_ix(payer, config, protocol, fields)], &[])
        .await
        .unwrap();
    send(
        &mut ctx,
        vec![assert_ix(protocol, fields.subject_hash, fields.organization_commitment)],
        &[],
    )
    .await
    .unwrap();
}

fn assert_ix(protocol: Pubkey, subject_hash: [u8; 32], organization_commitment: [u8; 32]) -> Instruction {
    let (entitlement, _) = entitlement_pda(&protocol, &subject_hash, &organization_commitment);
    Instruction {
        program_id: PROTOCOL_ID,
        accounts: abraxas_protocol_access::accounts::AssertProtocolAccess {
            protocol,
            entitlement,
        }
        .to_account_metas(None),
        data: abraxas_protocol_access::instruction::AssertProtocolAccess {
            subject_hash,
            organization_commitment,
        }
        .data(),
    }
}

#[tokio::test]
async fn replay_access_fails() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize_gate(&mut ctx, &admin, default_params(signer.pubkey().to_bytes(), fields)).await;
    let protocol = initialize_protocol(&mut ctx, config, fields).await;
    authorize(&mut ctx, &signer, config, fields).await;
    let payer = ctx.payer.pubkey();
    send(&mut ctx, vec![activate_ix(payer, config, protocol, fields)], &[])
        .await
        .unwrap();
    refresh(&mut ctx).await;
    let err = send(&mut ctx, vec![activate_ix(payer, config, protocol, fields)], &[])
        .await
        .unwrap_err();
    assert!(custom_code(&err).is_some());
}

#[tokio::test]
async fn expiry_fails() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let mut fields = MessageFields::default();
    fields.expires_at = 50;
    let config = initialize_gate(&mut ctx, &admin, default_params(signer.pubkey().to_bytes(), fields)).await;
    initialize_protocol(&mut ctx, config, fields).await;
    set_clock(&mut ctx, 100).await;
    let message = canonical_message(fields);
    let payer = ctx.payer.pubkey();
    let err = send(
        &mut ctx,
        vec![
            ed25519_ix(&signer, &message),
            authorize_ix(payer, config, fields.attestation_id),
        ],
        &[],
    )
    .await
    .unwrap_err();
    assert!(custom_code(&err).is_some());
}

#[tokio::test]
async fn wrong_action_hash_fails() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let mut params = default_params(signer.pubkey().to_bytes(), fields);
    params.action_hash = h32(99);
    let config = initialize_gate(&mut ctx, &admin, params).await;
    let payer = ctx.payer.pubkey();
    let err = send(&mut ctx, vec![initialize_protocol_ix(payer, config, fields)], &[])
        .await
        .unwrap_err();
    assert!(custom_code(&err).is_some());
    let (protocol, _) = protocol_pda(&config);
    assert!(ctx.banks_client.get_account(protocol).await.unwrap().is_none());
}

#[tokio::test]
async fn altered_ed25519_message_fails() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize_gate(&mut ctx, &admin, default_params(signer.pubkey().to_bytes(), fields)).await;
    initialize_protocol(&mut ctx, config, fields).await;
    let mut altered = fields;
    altered.partner_hash = h32(9);
    let message = canonical_message(altered);
    let payer = ctx.payer.pubkey();
    let err = send(
        &mut ctx,
        vec![
            ed25519_ix(&signer, &message),
            authorize_ix(payer, config, fields.attestation_id),
        ],
        &[],
    )
    .await
    .unwrap_err();
    assert!(custom_code(&err).is_some());
}

#[tokio::test]
async fn wrong_gate_config_fails() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let other = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    airdrop(&mut ctx, &other).await;
    let fields = MessageFields::default();
    let config = initialize_gate(&mut ctx, &admin, default_params(signer.pubkey().to_bytes(), fields)).await;
    let other_config = initialize_gate(&mut ctx, &other, default_params(signer.pubkey().to_bytes(), fields)).await;
    let protocol = initialize_protocol(&mut ctx, config, fields).await;
    authorize(&mut ctx, &signer, other_config, fields).await;
    let payer = ctx.payer.pubkey();
    let err = send(&mut ctx, vec![activate_ix(payer, other_config, protocol, fields)], &[])
        .await
        .unwrap_err();
    assert!(custom_code(&err).is_some());
}

#[tokio::test]
async fn missing_subject_fails() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let mut fields = MessageFields::default();
    fields.subject_hash = [0u8; 32];
    let config = initialize_gate(&mut ctx, &admin, default_params(signer.pubkey().to_bytes(), fields)).await;
    initialize_protocol(&mut ctx, config, fields).await;
    let message = canonical_message(fields);
    let payer = ctx.payer.pubkey();
    let err = send(
        &mut ctx,
        vec![
            ed25519_ix(&signer, &message),
            authorize_ix(payer, config, fields.attestation_id),
        ],
        &[],
    )
    .await
    .unwrap_err();
    assert!(custom_code(&err).is_some());
}

#[tokio::test]
async fn direct_bypass_without_authorization_fails() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize_gate(&mut ctx, &admin, default_params(signer.pubkey().to_bytes(), fields)).await;
    let protocol = initialize_protocol(&mut ctx, config, fields).await;
    let payer = ctx.payer.pubkey();
    let err = send(&mut ctx, vec![activate_ix(payer, config, protocol, fields)], &[])
        .await
        .unwrap_err();
    assert!(custom_code(&err).is_some() || matches!(err, BanksClientError::TransactionError(_)));
}

#[tokio::test]
async fn access_inactive_after_valid_until() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let mut fields = MessageFields::default();
    fields.expires_at = 2_000_000_000;
    let config = initialize_gate(&mut ctx, &admin, default_params(signer.pubkey().to_bytes(), fields)).await;
    let protocol = initialize_protocol(&mut ctx, config, fields).await;
    authorize(&mut ctx, &signer, config, fields).await;
    let payer = ctx.payer.pubkey();
    send(&mut ctx, vec![activate_ix(payer, config, protocol, fields)], &[])
        .await
        .unwrap();
    send(&mut ctx, vec![assert_ix(protocol, fields.subject_hash, fields.organization_commitment)], &[])
        .await
        .unwrap();
    set_clock(&mut ctx, 2_000_000_000).await;
    refresh(&mut ctx).await;
    let err = send(&mut ctx, vec![assert_ix(protocol, fields.subject_hash, fields.organization_commitment)], &[])
        .await
        .unwrap_err();
    assert!(custom_code(&err).is_some());
}

#[tokio::test]
async fn renewal_extends_valid_until() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let mut first = MessageFields::default();
    first.expires_at = 2_000_000_000;
    let config = initialize_gate(&mut ctx, &admin, default_params(signer.pubkey().to_bytes(), first)).await;
    let protocol = initialize_protocol(&mut ctx, config, first).await;
    authorize(&mut ctx, &signer, config, first).await;
    let payer = ctx.payer.pubkey();
    send(&mut ctx, vec![activate_ix(payer, config, protocol, first)], &[])
        .await
        .unwrap();
    let mut second = first;
    second.expires_at = 3_000_000_000;
    second.nonce = h32(90);
    second.attestation_id = h32(91);
    authorize(&mut ctx, &signer, config, second).await;
    send(&mut ctx, vec![activate_ix(payer, config, protocol, second)], &[])
        .await
        .unwrap();
    set_clock(&mut ctx, 2_500_000_000).await;
    refresh(&mut ctx).await;
    send(&mut ctx, vec![assert_ix(protocol, second.subject_hash, second.organization_commitment)], &[])
        .await
        .unwrap();
}

#[tokio::test]
async fn stale_attestation_does_not_shorten() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let mut newer = MessageFields::default();
    newer.expires_at = 3_000_000_000;
    let config = initialize_gate(&mut ctx, &admin, default_params(signer.pubkey().to_bytes(), newer)).await;
    let protocol = initialize_protocol(&mut ctx, config, newer).await;
    authorize(&mut ctx, &signer, config, newer).await;
    let payer = ctx.payer.pubkey();
    send(&mut ctx, vec![activate_ix(payer, config, protocol, newer)], &[])
        .await
        .unwrap();
    let mut older = newer;
    older.expires_at = 2_000_000_000;
    older.nonce = h32(80);
    older.attestation_id = h32(81);
    authorize(&mut ctx, &signer, config, older).await;
    let err = send(&mut ctx, vec![activate_ix(payer, config, protocol, older)], &[])
        .await
        .unwrap_err();
    assert!(custom_code(&err).is_some());
    set_clock(&mut ctx, 2_500_000_000).await;
    refresh(&mut ctx).await;
    send(&mut ctx, vec![assert_ix(protocol, newer.subject_hash, newer.organization_commitment)], &[])
        .await
        .unwrap();
}

#[tokio::test]
async fn direct_expiry_bypass_has_no_instruction() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let mut fields = MessageFields::default();
    fields.expires_at = 2_000_000_000;
    let config = initialize_gate(&mut ctx, &admin, default_params(signer.pubkey().to_bytes(), fields)).await;
    let protocol = initialize_protocol(&mut ctx, config, fields).await;
    authorize(&mut ctx, &signer, config, fields).await;
    let payer = ctx.payer.pubkey();
    send(&mut ctx, vec![activate_ix(payer, config, protocol, fields)], &[])
        .await
        .unwrap();
    let (entitlement, _) = entitlement_pda(&protocol, &fields.subject_hash, &fields.organization_commitment);
    let ix = Instruction {
        program_id: PROTOCOL_ID,
        accounts: abraxas_protocol_access::accounts::AssertProtocolAccess {
            protocol,
            entitlement,
        }
        .to_account_metas(None),
        data: vec![0xff, 0xff, 0xff, 0xff],
    };
    let err = send(&mut ctx, vec![ix], &[]).await.unwrap_err();
    assert!(custom_code(&err).is_some() || matches!(err, BanksClientError::TransactionError(_)));
    set_clock(&mut ctx, 2_000_000_000).await;
    refresh(&mut ctx).await;
    let err = send(&mut ctx, vec![assert_ix(protocol, fields.subject_hash, fields.organization_commitment)], &[])
        .await
        .unwrap_err();
    assert!(custom_code(&err).is_some());
}

#[tokio::test]
async fn activate_rejects_subject_swap() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let fields = MessageFields::default();
    let config = initialize_gate(&mut ctx, &admin, default_params(signer.pubkey().to_bytes(), fields)).await;
    let protocol = initialize_protocol(&mut ctx, config, fields).await;
    authorize(&mut ctx, &signer, config, fields).await;
    let mut swapped = fields;
    swapped.subject_hash = h32(99);
    let payer = ctx.payer.pubkey();
    let err = send(&mut ctx, vec![activate_ix(payer, config, protocol, swapped)], &[])
        .await
        .unwrap_err();
    assert!(custom_code(&err).is_some());
}

#[tokio::test]
async fn revoked_signer_blocks_new_issuance() {
    let mut ctx = start().await;
    let admin = Keypair::new();
    let signer = Keypair::new();
    airdrop(&mut ctx, &admin).await;
    let mut fields = MessageFields::default();
    fields.expires_at = 2_000_000_000;
    let config = initialize_gate(&mut ctx, &admin, default_params(signer.pubkey().to_bytes(), fields)).await;
    let _protocol = initialize_protocol(&mut ctx, config, fields).await;
    send(
        &mut ctx,
        vec![mutate_signer_ix(
            admin.pubkey(),
            config,
            abraxas_eligibility_gate::instruction::RevokeTrustedSigner {
                key_id: fields.signer_key_id,
            }
            .data(),
        )],
        &[&admin],
    )
    .await
    .unwrap();
    let payer = ctx.payer.pubkey();
    let err = send(
        &mut ctx,
        vec![
            ed25519_ix(&signer, &canonical_message(fields)),
            authorize_ix(payer, config, fields.attestation_id),
        ],
        &[],
    )
    .await
    .unwrap_err();
    assert!(custom_code(&err).is_some());
}
