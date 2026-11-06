use abraxas_eligibility_gate::canonical::CONFIG_SEED;
use abraxas_eligibility_gate::{
    GateConfig, LegacyGateConfig, SignerSlot, ID as GATE_ID, LEGACY_GATE_CONFIG_ACCOUNT_SIZE,
    MAX_SIGNERS, SIGNER_ACTIVE,
};
use abraxas_protocol_access::{
    LegacyProtocolAccessConfig, ProtocolAccessConfig, ID as PROTOCOL_ID,
    LEGACY_PROTOCOL_CONFIG_ACCOUNT_SIZE, PROTOCOL_CONFIG_SEED,
};
use anchor_lang::{
    system_program, AccountDeserialize, AnchorSerialize, Discriminator, InstructionData, Space,
    ToAccountMetas,
};
use solana_program_test::{processor, BanksClientError, ProgramTest, ProgramTestContext};
use solana_sdk::{
    account::Account,
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    instruction::Instruction,
    pubkey::Pubkey,
    rent::Rent,
    signature::{Keypair, Signer},
    system_instruction,
    transaction::Transaction,
};

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

fn account_data<T: AnchorSerialize>(discriminator: &[u8; 8], value: &T) -> Vec<u8> {
    let mut data = discriminator.to_vec();
    value.serialize(&mut data).unwrap();
    data
}

async fn send(
    ctx: &mut ProgramTestContext,
    instructions: Vec<Instruction>,
    signers: &[&Keypair],
) -> Result<(), BanksClientError> {
    let mut all_signers: Vec<&Keypair> = vec![&ctx.payer];
    all_signers.extend_from_slice(signers);
    let transaction = Transaction::new_signed_with_payer(
        &instructions,
        Some(&ctx.payer.pubkey()),
        &all_signers,
        ctx.last_blockhash,
    );
    ctx.banks_client.process_transaction(transaction).await
}

fn legacy_gate(admin: Pubkey, bump: u8) -> LegacyGateConfig {
    let mut signers = [SignerSlot::default(); MAX_SIGNERS];
    signers[0] = SignerSlot {
        key_id: [9; 32],
        pubkey: [10; 32],
        status: SIGNER_ACTIVE,
    };
    LegacyGateConfig {
        admin,
        partner_program: PROTOCOL_ID,
        network_id: [1; 32],
        partner_hash: [2; 32],
        policy_hash: [3; 32],
        action_hash: [4; 32],
        environment: [5; 32],
        require_subject: true,
        require_institutional: false,
        expected_organization_commitment: [6; 32],
        expected_actor_commitment: [7; 32],
        expected_institutional_result_category: [8; 32],
        bump,
        signers,
    }
}

#[tokio::test]
async fn deployed_591_byte_gate_config_migrates_without_changing_bindings() {
    let admin = Keypair::new();
    let attacker = Keypair::new();
    let (config_address, bump) =
        Pubkey::find_program_address(&[CONFIG_SEED, admin.pubkey().as_ref()], &GATE_ID);
    let legacy = legacy_gate(admin.pubkey(), bump);
    let data = account_data(&GateConfig::DISCRIMINATOR, &legacy);
    assert_eq!(data.len(), LEGACY_GATE_CONFIG_ACCOUNT_SIZE);

    let mut test = ProgramTest::new(
        "abraxas_eligibility_gate",
        GATE_ID,
        processor!(gate_process),
    );
    test.add_account(
        config_address,
        Account {
            lamports: Rent::default().minimum_balance(data.len()),
            data,
            owner: GATE_ID,
            executable: false,
            rent_epoch: 0,
        },
    );
    let mut ctx = test.start_with_context().await;
    let payer = ctx.payer.pubkey();
    send(
        &mut ctx,
        vec![
            system_instruction::transfer(&payer, &admin.pubkey(), 1_000_000_000),
            system_instruction::transfer(&payer, &attacker.pubkey(), 1_000_000_000),
        ],
        &[],
    )
    .await
    .unwrap();
    let unauthorized = Instruction {
        program_id: GATE_ID,
        accounts: abraxas_eligibility_gate::accounts::MigrateLegacyConfig {
            admin: attacker.pubkey(),
            config: config_address,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: abraxas_eligibility_gate::instruction::MigrateLegacyConfig {}.data(),
    };
    assert!(send(&mut ctx, vec![unauthorized], &[&attacker])
        .await
        .is_err());

    let ix = Instruction {
        program_id: GATE_ID,
        accounts: abraxas_eligibility_gate::accounts::MigrateLegacyConfig {
            admin: admin.pubkey(),
            config: config_address,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: abraxas_eligibility_gate::instruction::MigrateLegacyConfig {}.data(),
    };
    send(&mut ctx, vec![ix.clone()], &[&admin]).await.unwrap();

    let account = ctx
        .banks_client
        .get_account(config_address)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(account.data.len(), 8 + GateConfig::INIT_SPACE);
    let migrated = GateConfig::try_deserialize(&mut &account.data[..]).unwrap();
    assert_eq!(migrated.admin, legacy.admin);
    assert_eq!(migrated.policy_hash, legacy.policy_hash);
    assert_eq!(migrated.signers[0].key_id, legacy.signers[0].key_id);
    assert_eq!(migrated.version, 1);
    let slot = ctx.banks_client.get_root_slot().await.unwrap();
    ctx.warp_to_slot(slot + 2).unwrap();
    ctx.last_blockhash = ctx.banks_client.get_latest_blockhash().await.unwrap();
    assert!(send(&mut ctx, vec![ix], &[&admin]).await.is_err());
}

#[tokio::test]
async fn deployed_169_byte_protocol_config_migrates_and_binds_gate_version() {
    let admin = Keypair::new();
    let (config_address, config_bump) =
        Pubkey::find_program_address(&[CONFIG_SEED, admin.pubkey().as_ref()], &GATE_ID);
    let legacy_gate = legacy_gate(admin.pubkey(), config_bump);
    let gate = GateConfig {
        admin: legacy_gate.admin,
        partner_program: legacy_gate.partner_program,
        network_id: legacy_gate.network_id,
        partner_hash: legacy_gate.partner_hash,
        policy_hash: legacy_gate.policy_hash,
        action_hash: legacy_gate.action_hash,
        environment: legacy_gate.environment,
        require_subject: legacy_gate.require_subject,
        require_institutional: legacy_gate.require_institutional,
        expected_organization_commitment: legacy_gate.expected_organization_commitment,
        expected_actor_commitment: legacy_gate.expected_actor_commitment,
        expected_institutional_result_category: legacy_gate.expected_institutional_result_category,
        bump: legacy_gate.bump,
        signers: legacy_gate.signers,
        version: 7,
    };
    let (protocol_address, protocol_bump) = Pubkey::find_program_address(
        &[PROTOCOL_CONFIG_SEED, config_address.as_ref()],
        &PROTOCOL_ID,
    );
    let legacy_protocol = LegacyProtocolAccessConfig {
        gate_config: config_address,
        expected_partner_hash: gate.partner_hash,
        expected_policy_hash: gate.policy_hash,
        expected_action_hash: gate.action_hash,
        expected_environment: gate.environment,
        bump: protocol_bump,
    };
    let gate_data = account_data(&GateConfig::DISCRIMINATOR, &gate);
    let protocol_data = account_data(&ProtocolAccessConfig::DISCRIMINATOR, &legacy_protocol);
    assert_eq!(protocol_data.len(), LEGACY_PROTOCOL_CONFIG_ACCOUNT_SIZE);

    let mut test = ProgramTest::new(
        "abraxas_protocol_access",
        PROTOCOL_ID,
        processor!(protocol_process),
    );
    test.add_program(
        "abraxas_eligibility_gate",
        GATE_ID,
        processor!(gate_process),
    );
    test.add_account(
        config_address,
        Account {
            lamports: Rent::default().minimum_balance(gate_data.len()),
            data: gate_data,
            owner: GATE_ID,
            executable: false,
            rent_epoch: 0,
        },
    );
    test.add_account(
        protocol_address,
        Account {
            lamports: Rent::default().minimum_balance(protocol_data.len()),
            data: protocol_data,
            owner: PROTOCOL_ID,
            executable: false,
            rent_epoch: 0,
        },
    );
    let mut ctx = test.start_with_context().await;
    let payer = ctx.payer.pubkey();
    send(
        &mut ctx,
        vec![system_instruction::transfer(
            &payer,
            &admin.pubkey(),
            1_000_000_000,
        )],
        &[],
    )
    .await
    .unwrap();
    let ix = Instruction {
        program_id: PROTOCOL_ID,
        accounts: abraxas_protocol_access::accounts::MigrateLegacyProtocolConfig {
            admin: admin.pubkey(),
            config: config_address,
            protocol: protocol_address,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: abraxas_protocol_access::instruction::MigrateLegacyProtocolConfig {}.data(),
    };
    send(&mut ctx, vec![ix], &[&admin]).await.unwrap();
    let account = ctx
        .banks_client
        .get_account(protocol_address)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(account.data.len(), 8 + ProtocolAccessConfig::INIT_SPACE);
    let migrated = ProtocolAccessConfig::try_deserialize(&mut &account.data[..]).unwrap();
    assert_eq!(migrated.gate_config, config_address);
    assert_eq!(migrated.expected_policy_hash, gate.policy_hash);
    assert_eq!(migrated.config_version, gate.version);
}

