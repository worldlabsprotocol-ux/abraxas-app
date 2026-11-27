//! Shared ProgramTest harness for proof-continuity Token-2022 entitlements + consumer (#979–#981).

use abraxas_proof_entitlement_consumer::{
    ENTITLEMENT_CONSUMPTION_SEED, ID as CONSUMER_ID, RELYING_PARTY_CONFIG_SEED,
};
use abraxas_proof_continuity::{
    COMMITMENT_MESSAGE_LEN, COMMITMENT_SEED, ENTITLEMENT_ISSUANCE_SEED, ENTITLEMENT_MINT_AUTHORITY_SEED,
    ENTITLEMENT_MINT_CONFIG_SEED, ENTITLEMENT_MINT_SEED, EXECUTION_LEDGER_SEED, ID as PROOF_ID,
    PROOF_CONTINUITY_PREFIX, REGISTRY_SEED, SANDBOX_BINDING_SEED, STATUS_REVOKED, STATUS_UPDATE_PREFIX,
};
use anchor_lang::{InstructionData, ToAccountMetas};
use solana_program_test::{processor, BanksClient, BanksClientError, ProgramTest, ProgramTestContext};
use solana_sdk::{
    ed25519_program,
    instruction::Instruction,
    program_pack::Pack,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_instruction,
    system_program,
    transaction::Transaction,
};
use spl_associated_token_account::get_associated_token_address_with_program_id;
use spl_token_2022::{
    extension::{
        non_transferable::NonTransferable, BaseStateWithExtensions, StateWithExtensions,
    },
    instruction as token_ix,
    state::{Account as TokenAccountState, Mint as MintState},
};

pub fn h32(fill: u8) -> [u8; 32] {
    [fill; 32]
}

pub fn commitment_message(
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
    message[off..off + 8].copy_from_slice(&expires_at.to_be_bytes());
    off += 8;
    message[off..off + 8].copy_from_slice(&status_version.to_be_bytes());
    off += 8;
    message[off..off + 8].copy_from_slice(&execution_nonce.to_be_bytes());
    message
}

pub fn status_update_message(
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
        receipt_id_hash,
        payload_hash,
        partner_hash,
        policy_hash,
        application_hash,
        expires_at,
        status_version,
        execution_nonce,
    );
    let mut message = Vec::new();
    message.extend_from_slice(STATUS_UPDATE_PREFIX);
    message.extend_from_slice(&canonical[PROOF_CONTINUITY_PREFIX.len()..]);
    message.push(status);
    message
}

pub fn ed25519_ix(signer: &Keypair, message: &[u8]) -> Instruction {
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

pub fn consumer_process<'a, 'b, 'c, 'd>(
    program_id: &'a Pubkey,
    accounts: &'b [solana_sdk::account_info::AccountInfo<'c>],
    data: &'d [u8],
) -> solana_sdk::entrypoint::ProgramResult {
    abraxas_proof_entitlement_consumer::entry(
        unsafe { &*(program_id as *const Pubkey) },
        unsafe {
            &*(accounts as *const [solana_sdk::account_info::AccountInfo<'c>]
                as *const [solana_sdk::account_info::AccountInfo])
        },
        data,
    )
}

pub fn proof_process<'a, 'b, 'c, 'd>(
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

pub fn registry_pda(admin: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[REGISTRY_SEED, admin.as_ref()], &PROOF_ID)
}

pub fn sandbox_pda(registry: &Pubkey, holder: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[SANDBOX_BINDING_SEED, registry.as_ref(), holder.as_ref()],
        &PROOF_ID,
    )
}

pub fn ledger_pda(sandbox: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[EXECUTION_LEDGER_SEED, sandbox.as_ref()], &PROOF_ID)
}

pub fn commitment_pda(registry: &Pubkey, receipt_id_hash: &[u8; 32]) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[COMMITMENT_SEED, registry.as_ref(), receipt_id_hash.as_ref()],
        &PROOF_ID,
    )
}

pub fn entitlement_config_pda(registry: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[ENTITLEMENT_MINT_CONFIG_SEED, registry.as_ref()], &PROOF_ID)
}

pub fn entitlement_mint_pda(registry: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[ENTITLEMENT_MINT_SEED, registry.as_ref()], &PROOF_ID)
}

pub fn mint_authority_pda(registry: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[ENTITLEMENT_MINT_AUTHORITY_SEED, registry.as_ref()],
        &PROOF_ID,
    )
}

pub fn issuance_ledger_pda(registry: &Pubkey, receipt: &[u8; 32]) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            ENTITLEMENT_ISSUANCE_SEED,
            registry.as_ref(),
            receipt.as_ref(),
        ],
        &PROOF_ID,
    )
}

pub async fn send(
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

pub async fn refresh_blockhash(ctx: &mut ProgramTestContext) {
    let slot = ctx.banks_client.get_root_slot().await.unwrap();
    ctx.warp_to_slot(slot + 2).unwrap();
    ctx.last_blockhash = ctx.banks_client.get_latest_blockhash().await.unwrap();
}

pub async fn start() -> ProgramTestContext {
    let mut program_test = if std::env::var_os("ABRAXAS_PROOF_SBF").is_some() {
        ProgramTest::new("abraxas_proof_continuity", PROOF_ID, None)
    } else {
        ProgramTest::new("abraxas_proof_continuity", PROOF_ID, processor!(proof_process))
    };
    program_test.add_program(
        "spl_token_2022",
        spl_token_2022::id(),
        processor!(spl_token_2022::processor::Processor::process),
    );
    program_test.add_program(
        "spl_associated_token_account",
        spl_associated_token_account::id(),
        processor!(spl_associated_token_account::processor::process_instruction),
    );
    program_test.add_program(
        "abraxas_proof_entitlement_consumer",
        CONSUMER_ID,
        processor!(consumer_process),
    );
    program_test.start_with_context().await
}

pub fn consumption_pda(registry: &Pubkey, receipt: &[u8; 32]) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            ENTITLEMENT_CONSUMPTION_SEED,
            registry.as_ref(),
            receipt.as_ref(),
        ],
        &CONSUMER_ID,
    )
}

pub fn trusted_config_pda(relying_party_admin: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[RELYING_PARTY_CONFIG_SEED, relying_party_admin.as_ref()],
        &CONSUMER_ID,
    )
}

pub fn initialize_trusted_config_ix(
    payer: Pubkey,
    relying_party_admin: &Keypair,
    proof_registry_admin: Pubkey,
    partner: [u8; 32],
    policy: [u8; 32],
    application: [u8; 32],
) -> Instruction {
    let (trusted_config, _) = trusted_config_pda(&relying_party_admin.pubkey());
    Instruction {
        program_id: CONSUMER_ID,
        accounts: abraxas_proof_entitlement_consumer::accounts::InitializeTrustedConfig {
            admin: relying_party_admin.pubkey(),
            trusted_config,
            system_program: system_program::id(),
        }
        .to_account_metas(None),
        data: abraxas_proof_entitlement_consumer::instruction::InitializeTrustedConfig {
            proof_registry_admin,
            partner_hash: partner,
            policy_hash: policy,
            application_hash: application,
        }
        .data(),
    }
}

pub fn update_trusted_config_ix(
    relying_party_admin: &Keypair,
    next_config_version: u64,
    partner: [u8; 32],
    policy: [u8; 32],
    application: [u8; 32],
) -> Instruction {
    let (trusted_config, _) = trusted_config_pda(&relying_party_admin.pubkey());
    Instruction {
        program_id: CONSUMER_ID,
        accounts: abraxas_proof_entitlement_consumer::accounts::UpdateTrustedConfig {
            admin: relying_party_admin.pubkey(),
            trusted_config,
        }
        .to_account_metas(None),
        data: abraxas_proof_entitlement_consumer::instruction::UpdateTrustedConfig {
            next_config_version,
            partner_hash: partner,
            policy_hash: policy,
            application_hash: application,
        }
        .data(),
    }
}

pub fn consume_entitlement_ix_with_config(
    payer: Pubkey,
    holder: &Keypair,
    env: &HarnessEnv,
    trusted_config: Pubkey,
) -> Instruction {
    let (issuance_ledger, _) = issuance_ledger_pda(&env.registry, &env.receipt);
    let (consumption, _) = consumption_pda(&env.registry, &env.receipt);
    let ata = get_associated_token_address_with_program_id(
        &holder.pubkey(),
        &env.mint,
        &spl_token_2022::id(),
    );
    Instruction {
        program_id: CONSUMER_ID,
        accounts: abraxas_proof_entitlement_consumer::accounts::ConsumeVerifiedEntitlement {
            payer,
            holder: holder.pubkey(),
            proof_continuity_program: PROOF_ID,
            trusted_config,
            registry_admin: env.registry_admin,
            registry: env.registry,
            commitment: env.commitment,
            entitlement_mint_config: env.mint_config,
            mint: env.mint,
            recipient_token_account: ata,
            issuance_ledger,
            consumption,
            token_program: spl_token_2022::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None),
        data: abraxas_proof_entitlement_consumer::instruction::ConsumeVerifiedEntitlement {
            receipt_id_hash: env.receipt,
        }
        .data(),
    }
}

pub fn consume_entitlement_ix(payer: Pubkey, holder: &Keypair, env: &HarnessEnv) -> Instruction {
    consume_entitlement_ix_with_config(payer, holder, env, env.trusted_config)
}

pub struct HarnessEnv {
    pub relying_party_admin: Pubkey,
    pub trusted_config: Pubkey,
    pub partner: [u8; 32],
    pub policy: [u8; 32],
    pub application: [u8; 32],
    pub registry_admin: Pubkey,
    pub registry: Pubkey,
    pub sandbox: Pubkey,
    pub commitment: Pubkey,
    pub mint: Pubkey,
    pub mint_config: Pubkey,
    pub mint_authority: Pubkey,
    pub receipt: [u8; 32],
    pub payload: [u8; 32],
    pub expires_at: i64,
}

pub async fn setup_harness_with_entitlement_mint(
    ctx: &mut ProgramTestContext,
    admin: &Keypair,
    issuer: &Keypair,
    holder: &Keypair,
    relying_party_admin: &Keypair,
) -> HarnessEnv {
    let partner = h32(11);
    let policy = h32(12);
    let application = h32(13);
    let receipt = h32(21);
    let payload = h32(15);
    let expires_at: i64 = 9_000_000_000;

    let (registry, _) = registry_pda(&admin.pubkey());
    send(
        ctx,
        vec![Instruction {
            program_id: PROOF_ID,
            accounts: abraxas_proof_continuity::accounts::InitializeProofRegistry {
                admin: admin.pubkey(),
                registry,
                system_program: system_program::id(),
            }
            .to_account_metas(None),
            data: abraxas_proof_continuity::instruction::InitializeProofRegistry {
                trusted_issuer_pubkey: issuer.pubkey().to_bytes(),
                partner_hash: partner,
                policy_hash: policy,
                application_hash: application,
            }
            .data(),
        }],
        &[admin],
    )
    .await
    .unwrap();

    send(
        ctx,
        vec![system_instruction::transfer(&admin.pubkey(), &holder.pubkey(), 2_000_000_000)],
        &[admin],
    )
    .await
    .unwrap();

    let (sandbox, _) = sandbox_pda(&registry, &holder.pubkey());
    send(
        ctx,
        vec![Instruction {
            program_id: PROOF_ID,
            accounts: abraxas_proof_continuity::accounts::RegisterSandboxBinding {
                holder: holder.pubkey(),
                registry,
                sandbox,
                system_program: system_program::id(),
            }
            .to_account_metas(None),
            data: abraxas_proof_continuity::instruction::RegisterSandboxBinding {}.data(),
        }],
        &[holder],
    )
    .await
    .unwrap();

    let (ledger, _) = ledger_pda(&sandbox);
    let (commitment, _) = commitment_pda(&registry, &receipt);
    let message =
        commitment_message(receipt, payload, partner, policy, application, expires_at, 1, 1);
    send(
        ctx,
        vec![
            ed25519_ix(issuer, &message),
            Instruction {
                program_id: PROOF_ID,
                accounts: abraxas_proof_continuity::accounts::ExecuteHarnessRun {
                    payer: ctx.payer.pubkey(),
                    holder: holder.pubkey(),
                    registry,
                    sandbox,
                    ledger,
                    commitment,
                    instructions: solana_sdk::sysvar::instructions::id(),
                    system_program: system_program::id(),
                }
                .to_account_metas(None),
                data: abraxas_proof_continuity::instruction::ExecuteHarnessRun {
                    execution_nonce: 1,
                    receipt_id_hash: receipt,
                    payload_hash: payload,
                    expires_at,
                    status_version: 1,
                }
                .data(),
            },
        ],
        &[holder],
    )
    .await
    .unwrap();

    let (mint_config, _) = entitlement_config_pda(&registry);
    let (mint, _) = entitlement_mint_pda(&registry);
    let (mint_authority, _) = mint_authority_pda(&registry);
    send(
        ctx,
        vec![Instruction {
            program_id: PROOF_ID,
            accounts: abraxas_proof_continuity::accounts::InitializeEntitlementMint {
                admin: admin.pubkey(),
                registry,
                entitlement_mint_config: mint_config,
                mint,
                mint_authority,
                token_program: spl_token_2022::id(),
                system_program: system_program::id(),
            }
            .to_account_metas(None),
            data: abraxas_proof_continuity::instruction::InitializeEntitlementMint {}.data(),
        }],
        &[admin],
    )
    .await
    .unwrap();

    let (trusted_config, _) = trusted_config_pda(&relying_party_admin.pubkey());
    send(
        ctx,
        vec![initialize_trusted_config_ix(
            ctx.payer.pubkey(),
            relying_party_admin,
            admin.pubkey(),
            partner,
            policy,
            application,
        )],
        &[relying_party_admin],
    )
    .await
    .unwrap();

    HarnessEnv {
        relying_party_admin: relying_party_admin.pubkey(),
        trusted_config,
        partner,
        policy,
        application,
        registry_admin: admin.pubkey(),
        registry,
        sandbox,
        commitment,
        mint,
        mint_config,
        mint_authority,
        receipt,
        payload,
        expires_at,
    }
}

pub fn mint_entitlement_ix(
    payer: Pubkey,
    holder: &Keypair,
    env: &HarnessEnv,
    sandbox: Pubkey,
) -> Instruction {
    let (issuance_ledger, _) = issuance_ledger_pda(&env.registry, &env.receipt);
    let ata = get_associated_token_address_with_program_id(
        &holder.pubkey(),
        &env.mint,
        &spl_token_2022::id(),
    );
    Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::MintVerifiedEntitlement {
            payer,
            holder: holder.pubkey(),
            registry: env.registry,
            sandbox,
            commitment: env.commitment,
            entitlement_mint_config: env.mint_config,
            mint: env.mint,
            recipient_token_account: ata,
            issuance_ledger,
            mint_authority: env.mint_authority,
            token_program: spl_token_2022::id(),
            associated_token_program: spl_associated_token_account::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None),
        data: abraxas_proof_continuity::instruction::MintVerifiedEntitlement {
            receipt_id_hash: env.receipt,
        }
        .data(),
    }
}

pub async fn token_balance(ctx: &mut ProgramTestContext, ata: Pubkey) -> u64 {
    let acc = ctx
        .banks_client
        .get_account(ata)
        .await
        .unwrap()
        .expect("token account");
    StateWithExtensions::<TokenAccountState>::unpack(&acc.data)
        .unwrap()
        .base
        .amount
}

impl Clone for HarnessEnv {
    fn clone(&self) -> Self {
        Self {
            relying_party_admin: self.relying_party_admin,
            trusted_config: self.trusted_config,
            partner: self.partner,
            policy: self.policy,
            application: self.application,
            registry_admin: self.registry_admin,
            registry: self.registry,
            sandbox: self.sandbox,
            commitment: self.commitment,
            mint: self.mint,
            mint_config: self.mint_config,
            mint_authority: self.mint_authority,
            receipt: self.receipt,
            payload: self.payload,
            expires_at: self.expires_at,
        }
    }
}
