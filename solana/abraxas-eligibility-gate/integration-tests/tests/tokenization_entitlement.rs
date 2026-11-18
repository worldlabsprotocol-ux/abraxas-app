//! Capstone Token-2022 — verified entitlement mint after proof-continuity authorization.

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
    extension::StateWithExtensions,
    instruction as token_ix,
    state::Account as TokenAccountState,
};

fn h32(fill: u8) -> [u8; 32] {
    [fill; 32]
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
    message[off..off + 8].copy_from_slice(&expires_at.to_be_bytes());
    off += 8;
    message[off..off + 8].copy_from_slice(&status_version.to_be_bytes());
    off += 8;
    message[off..off + 8].copy_from_slice(&execution_nonce.to_be_bytes());
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

fn registry_pda(admin: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[REGISTRY_SEED, admin.as_ref()], &PROOF_ID)
}

fn sandbox_pda(registry: &Pubkey, holder: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[SANDBOX_BINDING_SEED, registry.as_ref(), holder.as_ref()],
        &PROOF_ID,
    )
}

fn ledger_pda(sandbox: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[EXECUTION_LEDGER_SEED, sandbox.as_ref()], &PROOF_ID)
}

fn commitment_pda(registry: &Pubkey, receipt_id_hash: &[u8; 32]) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[COMMITMENT_SEED, registry.as_ref(), receipt_id_hash.as_ref()],
        &PROOF_ID,
    )
}

fn entitlement_config_pda(registry: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[ENTITLEMENT_MINT_CONFIG_SEED, registry.as_ref()], &PROOF_ID)
}

fn entitlement_mint_pda(registry: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[ENTITLEMENT_MINT_SEED, registry.as_ref()], &PROOF_ID)
}

fn mint_authority_pda(registry: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[ENTITLEMENT_MINT_AUTHORITY_SEED, registry.as_ref()],
        &PROOF_ID,
    )
}

fn issuance_ledger_pda(registry: &Pubkey, receipt: &[u8; 32]) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            ENTITLEMENT_ISSUANCE_SEED,
            registry.as_ref(),
            receipt.as_ref(),
        ],
        &PROOF_ID,
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

async fn refresh_blockhash(ctx: &mut ProgramTestContext) {
    let slot = ctx.banks_client.get_root_slot().await.unwrap();
    ctx.warp_to_slot(slot + 2).unwrap();
    ctx.last_blockhash = ctx.banks_client.get_latest_blockhash().await.unwrap();
}

async fn start() -> ProgramTestContext {
    let mut program_test =
        ProgramTest::new("abraxas_proof_continuity", PROOF_ID, processor!(proof_process));
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
    program_test.start_with_context().await
}

struct HarnessEnv {
    registry: Pubkey,
    sandbox: Pubkey,
    commitment: Pubkey,
    mint: Pubkey,
    mint_config: Pubkey,
    mint_authority: Pubkey,
    receipt: [u8; 32],
    payload: [u8; 32],
    expires_at: i64,
}

async fn setup_harness_with_entitlement_mint(
    ctx: &mut ProgramTestContext,
    admin: &Keypair,
    issuer: &Keypair,
    holder: &Keypair,
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

    HarnessEnv {
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

fn mint_entitlement_ix(
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

async fn token_balance(ctx: &mut ProgramTestContext, ata: Pubkey) -> u64 {
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

#[tokio::test]
async fn authorized_proof_mints_one_entitlement_token() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder).await;

    let payer = ctx.payer.pubkey();
    send(
        &mut ctx,
        vec![mint_entitlement_ix(payer, &holder, &env, env.sandbox)],
        &[&holder],
    )
    .await
    .unwrap();

    let ata = get_associated_token_address_with_program_id(
        &holder.pubkey(),
        &env.mint,
        &spl_token_2022::id(),
    );
    assert_eq!(token_balance(&mut ctx, ata).await, 1);
}

#[tokio::test]
async fn duplicate_entitlement_mint_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder).await;
    let payer = ctx.payer.pubkey();
    let ix = mint_entitlement_ix(payer, &holder, &env, env.sandbox);
    send(&mut ctx, vec![ix.clone()], &[&holder]).await.unwrap();
  let ata = get_associated_token_address_with_program_id(
        &holder.pubkey(),
        &env.mint,
        &spl_token_2022::id(),
    );
    assert_eq!(token_balance(&mut ctx, ata).await, 1);
    let (ledger, _) = issuance_ledger_pda(&env.registry, &env.receipt);
    assert!(
        ctx.banks_client
            .get_account(ledger)
            .await
            .unwrap()
            .is_some(),
        "issuance ledger must exist after first mint"
    );
    refresh_blockhash(&mut ctx).await;
    let second = send(&mut ctx, vec![ix], &[&holder]).await;
    assert!(second.is_err(), "duplicate mint must fail: {:?}", second);
    assert_eq!(token_balance(&mut ctx, ata).await, 1);
}

#[tokio::test]
async fn wrong_wallet_entitlement_mint_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let impostor = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder).await;
    send(
        &mut ctx,
        vec![system_instruction::transfer(
            &admin.pubkey(),
            &impostor.pubkey(),
            500_000_000,
        )],
        &[&admin],
    )
    .await
    .unwrap();
    let (impostor_sandbox, _) = sandbox_pda(&env.registry, &impostor.pubkey());
    send(
        &mut ctx,
        vec![Instruction {
            program_id: PROOF_ID,
            accounts: abraxas_proof_continuity::accounts::RegisterSandboxBinding {
                holder: impostor.pubkey(),
                registry: env.registry,
                sandbox: impostor_sandbox,
                system_program: system_program::id(),
            }
            .to_account_metas(None),
            data: abraxas_proof_continuity::instruction::RegisterSandboxBinding {}.data(),
        }],
        &[&impostor],
    )
    .await
    .unwrap();
    let payer = ctx.payer.pubkey();
    assert!(
        send(
            &mut ctx,
            vec![mint_entitlement_ix(payer, &impostor, &env, impostor_sandbox)],
            &[&impostor],
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn wrong_policy_registry_entitlement_mint_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder).await;

    let (registry_b, _) = registry_pda(&holder.pubkey());
    send(
        &mut ctx,
        vec![Instruction {
            program_id: PROOF_ID,
            accounts: abraxas_proof_continuity::accounts::InitializeProofRegistry {
                admin: holder.pubkey(),
                registry: registry_b,
                system_program: system_program::id(),
            }
            .to_account_metas(None),
            data: abraxas_proof_continuity::instruction::InitializeProofRegistry {
                trusted_issuer_pubkey: issuer.pubkey().to_bytes(),
                partner_hash: h32(11),
                policy_hash: h32(99),
                application_hash: h32(13),
            }
            .data(),
        }],
        &[&holder],
    )
    .await
    .unwrap();

    let (config_b, _) = entitlement_config_pda(&registry_b);
    let (mint_b, _) = entitlement_mint_pda(&registry_b);
    let (auth_b, _) = mint_authority_pda(&registry_b);
    send(
        &mut ctx,
        vec![Instruction {
            program_id: PROOF_ID,
            accounts: abraxas_proof_continuity::accounts::InitializeEntitlementMint {
                admin: holder.pubkey(),
                registry: registry_b,
                entitlement_mint_config: config_b,
                mint: mint_b,
                mint_authority: auth_b,
                token_program: spl_token_2022::id(),
                system_program: system_program::id(),
            }
            .to_account_metas(None),
            data: abraxas_proof_continuity::instruction::InitializeEntitlementMint {}.data(),
        }],
        &[&holder],
    )
    .await
    .unwrap();

    let mut bad_env = env.clone();
    bad_env.registry = registry_b;
    bad_env.mint_config = config_b;
    bad_env.mint = mint_b;
    bad_env.mint_authority = auth_b;
    let payer = ctx.payer.pubkey();
    assert!(
        send(
            &mut ctx,
            vec![mint_entitlement_ix(payer, &holder, &bad_env, env.sandbox)],
            &[&holder],
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn revoked_proof_entitlement_mint_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder).await;

    let message = status_update_message(
        env.receipt,
        env.payload,
        h32(11),
        h32(12),
        h32(13),
        env.expires_at,
        2,
        1,
        STATUS_REVOKED,
    );
    let update_ix = Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::UpdateReceiptStatus {
            operator: admin.pubkey(),
            registry: env.registry,
            commitment: env.commitment,
            instructions: solana_sdk::sysvar::instructions::id(),
        }
        .to_account_metas(None),
        data: abraxas_proof_continuity::instruction::UpdateReceiptStatus {
            receipt_id_hash: env.receipt,
            payload_hash: env.payload,
            status: STATUS_REVOKED,
            status_version: 2,
            expires_at: env.expires_at,
        }
        .data(),
    };
    send(
        &mut ctx,
        vec![ed25519_ix(&issuer, &message), update_ix],
        &[&admin],
    )
    .await
    .unwrap();

    let payer = ctx.payer.pubkey();
    assert!(
        send(
            &mut ctx,
            vec![mint_entitlement_ix(payer, &holder, &env, env.sandbox)],
            &[&holder],
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn expired_proof_entitlement_mint_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder).await;

    let mut clock = ctx.banks_client.get_sysvar::<solana_sdk::clock::Clock>().await.unwrap();
    clock.unix_timestamp = env.expires_at + 1;
    ctx.set_sysvar::<solana_sdk::clock::Clock>(&clock);

    let payer = ctx.payer.pubkey();
    assert!(
        send(
            &mut ctx,
            vec![mint_entitlement_ix(payer, &holder, &env, env.sandbox)],
            &[&holder],
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn unauthorized_direct_token_mint_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder).await;

    let ata = get_associated_token_address_with_program_id(
        &holder.pubkey(),
        &env.mint,
        &spl_token_2022::id(),
    );
    let payer = ctx.payer.pubkey();
    let create_ata_ix = spl_associated_token_account::instruction::create_associated_token_account(
        &payer,
        &holder.pubkey(),
        &env.mint,
        &spl_token_2022::id(),
    );
    send(&mut ctx, vec![create_ata_ix], &[]).await.unwrap();

    let direct_mint = token_ix::mint_to(
        &spl_token_2022::id(),
        &env.mint,
        &ata,
        &holder.pubkey(),
        &[],
        1,
    )
    .unwrap();
    assert!(send(&mut ctx, vec![direct_mint], &[&holder]).await.is_err());
}

// HarnessEnv needs Clone for wrong_policy test
impl Clone for HarnessEnv {
    fn clone(&self) -> Self {
        Self {
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