//! BUILD #975 — local ProgramTest end-to-end blockchain-native harness journey.

use abraxas_proof_continuity::{
    COMMITMENT_MESSAGE_LEN, COMMITMENT_SEED, EXECUTION_LEDGER_SEED, ID as PROOF_ID,
    PROOF_CONTINUITY_PREFIX, REGISTRY_SEED, SANDBOX_BINDING_SEED,
};
use anchor_lang::{InstructionData, ToAccountMetas};
use solana_program_test::{processor, BanksClientError, ProgramTest, ProgramTestContext};
use solana_sdk::{
    ed25519_program,
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_instruction,
    system_program,
    transaction::Transaction,
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
    let mut off = 0;
    message[..PROOF_CONTINUITY_PREFIX.len()].copy_from_slice(PROOF_CONTINUITY_PREFIX);
    off += PROOF_CONTINUITY_PREFIX.len();
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

async fn execute_harness_run(
    ctx: &mut ProgramTestContext,
    registry: &Pubkey,
    sandbox: &Pubkey,
    holder: &Keypair,
    issuer: &Keypair,
    receipt: [u8; 32],
    payload: [u8; 32],
    partner: [u8; 32],
    policy: [u8; 32],
    application: [u8; 32],
    expires_at: i64,
    nonce: u64,
) -> Result<(), BanksClientError> {
    let (ledger, _) = ledger_pda(sandbox);
    let (commitment, _) = commitment_pda(registry, &receipt);
    let message = commitment_message(
        receipt, payload, partner, policy, application, expires_at, 1, nonce,
    );
    let ix = Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::ExecuteHarnessRun {
            payer: ctx.payer.pubkey(),
            holder: holder.pubkey(),
            registry: *registry,
            sandbox: *sandbox,
            ledger,
            commitment,
            instructions: solana_sdk::sysvar::instructions::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None),
        data: abraxas_proof_continuity::instruction::ExecuteHarnessRun {
            execution_nonce: nonce,
            receipt_id_hash: receipt,
            payload_hash: payload,
            expires_at,
            status_version: 1,
        }
        .data(),
    };
    send(ctx, vec![ed25519_ix(issuer, &message), ix], &[holder]).await
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

#[tokio::test]
async fn blockchain_native_launchpad_local_journey() {
    let program_test =
        ProgramTest::new("abraxas_proof_continuity", PROOF_ID, processor!(proof_process));
    let mut ctx = program_test.start_with_context().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();

    let partner = h32(11);
    let policy = h32(12);
    let application = h32(13);
    let receipt_one = h32(21);
    let receipt_two = h32(22);
    let payload = h32(15);
    let expires_at: i64 = 9_000_000_000;

    let (registry, _) = registry_pda(&admin.pubkey());
    send(
        &mut ctx,
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
        &[&admin],
    )
    .await
    .unwrap();

    send(
        &mut ctx,
        vec![system_instruction::transfer(
            &admin.pubkey(),
            &holder.pubkey(),
            2_000_000_000,
        )],
        &[&admin],
    )
    .await
    .unwrap();

    let (sandbox, _) = sandbox_pda(&registry, &holder.pubkey());
    send(
        &mut ctx,
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
        &[&holder],
    )
    .await
    .unwrap();

    execute_harness_run(
        &mut ctx,
        &registry,
        &sandbox,
        &holder,
        &issuer,
        receipt_one,
        payload,
        partner,
        policy,
        application,
        expires_at,
        1,
    )
    .await
    .unwrap();
    execute_harness_run(
        &mut ctx,
        &registry,
        &sandbox,
        &holder,
        &issuer,
        receipt_two,
        payload,
        partner,
        policy,
        application,
        expires_at,
        2,
    )
    .await
    .unwrap();
    // Ledger advanced to 2; stale execution nonce must fail closed.
    assert!(
        execute_harness_run(
            &mut ctx,
            &registry,
            &sandbox,
            &holder,
            &issuer,
            receipt_one,
            payload,
            partner,
            policy,
            application,
            expires_at,
            2,
        )
        .await
        .is_err()
    );
    // Same receipt cannot be committed twice even with a fresh nonce.
    assert!(
        execute_harness_run(
            &mut ctx,
            &registry,
            &sandbox,
            &holder,
            &issuer,
            receipt_two,
            payload,
            partner,
            policy,
            application,
            expires_at,
            3,
        )
        .await
        .is_err()
    );
}