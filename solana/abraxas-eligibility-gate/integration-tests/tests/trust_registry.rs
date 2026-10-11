use abraxas_trust_registry::{
    CommitmentState, COMMITMENT_ACTIVE, COMMITMENT_REVOKED, COMMITMENT_SEED, ID as TRUST_REGISTRY_ID,
    POLICY_SEED, REGISTRY_SEED,
};
use anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas};
use solana_program_test::{processor, BanksClientError, ProgramTest, ProgramTestContext};
use solana_sdk::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
    transaction::Transaction,
};

fn trust_registry_process<'a, 'b, 'c, 'd>(
    program_id: &'a Pubkey,
    accounts: &'b [AccountInfo<'c>],
    data: &'d [u8],
) -> ProgramResult {
    abraxas_trust_registry::entry(
        unsafe { &*(program_id as *const Pubkey) },
        unsafe { &*(accounts as *const [AccountInfo<'c>] as *const [AccountInfo]) },
        data,
    )
}

fn h32(fill: u8) -> [u8; 32] {
    [fill; 32]
}

fn pda(seeds: &[&[u8]], program: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(seeds, program)
}

async fn fund(ctx: &mut ProgramTestContext, to: &Pubkey, lamports: u64) {
    ctx.banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[solana_sdk::system_instruction::transfer(&ctx.payer.pubkey(), to, lamports)],
            Some(&ctx.payer.pubkey()),
            &[&ctx.payer],
            ctx.last_blockhash,
        ))
        .await
        .unwrap();
}

async fn setup() -> (ProgramTestContext, Keypair, [u8; 32]) {
    let mut test = ProgramTest::default();
    test.add_program(
        "abraxas_trust_registry",
        TRUST_REGISTRY_ID,
        processor!(trust_registry_process),
    );
    let mut ctx = test.start_with_context().await;
    let gov = Keypair::new();
    fund(&mut ctx, &gov.pubkey(), 5_000_000_000).await;
    let domain = h32(99);
    (ctx, gov, domain)
}

#[tokio::test]
async fn unauthorized_revoker_fails_at_program_level() {
    let (mut ctx, gov, domain) = setup().await;
    let policy_commitment = h32(13);
    let digest = h32(42);
    let (registry, _) = pda(&[REGISTRY_SEED, &domain], &TRUST_REGISTRY_ID);
    let (policy, _) = pda(
        &[POLICY_SEED, registry.as_ref(), &policy_commitment],
        &TRUST_REGISTRY_ID,
    );
    let (commitment_state, _) = pda(
        &[COMMITMENT_SEED, registry.as_ref(), &digest],
        &TRUST_REGISTRY_ID,
    );
    let publisher = Keypair::new();
    let attacker = Keypair::new();
    fund(&mut ctx, &publisher.pubkey(), 2_000_000_000).await;
    fund(&mut ctx, &attacker.pubkey(), 2_000_000_000).await;

    for (ix, signers) in [
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::InitializeRegistry {
                    governance_authority: gov.pubkey(),
                    registry,
                    system_program: system_program::ID,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::InitializeRegistry { registry_domain: domain }.data(),
            },
            vec![&gov],
        ),
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::RegisterPolicy {
                    governance_authority: gov.pubkey(),
                    registry,
                    policy,
                    system_program: system_program::ID,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::RegisterPolicy {
                    policy_commitment,
                    policy_version: 1,
                }
                .data(),
            },
            vec![&gov],
        ),
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::RegistryGovernanceMut {
                    governance_authority: gov.pubkey(),
                    registry,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::AddCommitmentPublisher {
                    key_id: h32(1),
                    pubkey: publisher.pubkey().to_bytes(),
                }
                .data(),
            },
            vec![&gov],
        ),
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::PublishCommitment {
                    publisher: publisher.pubkey(),
                    registry,
                    policy,
                    commitment_state,
                    system_program: system_program::ID,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::PublishCommitment {
                    commitment_digest: digest,
                    sequence: 1,
                }
                .data(),
            },
            vec![&publisher],
        ),
    ] {
        let payer = signers[0].pubkey();
        ctx.banks_client
            .process_transaction(Transaction::new_signed_with_payer(
                &[ix],
                Some(&payer),
                &signers,
                ctx.last_blockhash,
            ))
            .await
            .unwrap();
    }

    let ix_revoke = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::RevokeCommitment {
            revoker: attacker.pubkey(),
            registry,
            commitment_state,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::RevokeCommitment { sequence: 2 }.data(),
    };
    let err = ctx
        .banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[ix_revoke],
            Some(&attacker.pubkey()),
            &[&attacker],
            ctx.last_blockhash,
        ))
        .await
        .unwrap_err();
    assert!(matches!(err, BanksClientError::TransactionError(_)));
}

#[tokio::test]
async fn authorized_revoker_transitions_active_to_revoked() {
    let (mut ctx, gov, domain) = setup().await;
    let policy_commitment = h32(13);
    let digest = h32(42);
    let (registry, _) = pda(&[REGISTRY_SEED, &domain], &TRUST_REGISTRY_ID);
    let (policy, _) = pda(
        &[POLICY_SEED, registry.as_ref(), &policy_commitment],
        &TRUST_REGISTRY_ID,
    );
    let (commitment_state, _) = pda(
        &[COMMITMENT_SEED, registry.as_ref(), &digest],
        &TRUST_REGISTRY_ID,
    );
    let publisher = Keypair::new();
    let revoker = Keypair::new();
    fund(&mut ctx, &publisher.pubkey(), 2_000_000_000).await;
    fund(&mut ctx, &revoker.pubkey(), 2_000_000_000).await;

    for (ix, signers) in [
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::InitializeRegistry {
                    governance_authority: gov.pubkey(),
                    registry,
                    system_program: system_program::ID,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::InitializeRegistry { registry_domain: domain }.data(),
            },
            vec![&gov],
        ),
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::RegisterPolicy {
                    governance_authority: gov.pubkey(),
                    registry,
                    policy,
                    system_program: system_program::ID,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::RegisterPolicy {
                    policy_commitment,
                    policy_version: 1,
                }
                .data(),
            },
            vec![&gov],
        ),
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::RegistryGovernanceMut {
                    governance_authority: gov.pubkey(),
                    registry,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::AddCommitmentPublisher {
                    key_id: h32(1),
                    pubkey: publisher.pubkey().to_bytes(),
                }
                .data(),
            },
            vec![&gov],
        ),
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::RegistryGovernanceMut {
                    governance_authority: gov.pubkey(),
                    registry,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::AddRevoker {
                    key_id: h32(2),
                    pubkey: revoker.pubkey().to_bytes(),
                }
                .data(),
            },
            vec![&gov],
        ),
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::PublishCommitment {
                    publisher: publisher.pubkey(),
                    registry,
                    policy,
                    commitment_state,
                    system_program: system_program::ID,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::PublishCommitment {
                    commitment_digest: digest,
                    sequence: 1,
                }
                .data(),
            },
            vec![&publisher],
        ),
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::RevokeCommitment {
                    revoker: revoker.pubkey(),
                    registry,
                    commitment_state,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::RevokeCommitment { sequence: 2 }.data(),
            },
            vec![&revoker],
        ),
    ] {
        let payer = signers[0].pubkey();
        ctx.banks_client
            .process_transaction(Transaction::new_signed_with_payer(
                &[ix],
                Some(&payer),
                &signers,
                ctx.last_blockhash,
            ))
            .await
            .unwrap();
    }

    let account = ctx.banks_client.get_account(commitment_state).await.unwrap().unwrap();
    let state = CommitmentState::try_deserialize(&mut account.data.as_slice()).unwrap();
    assert_eq!(state.status, COMMITMENT_REVOKED);
    assert_eq!(state.sequence, 2);
}

#[tokio::test]
async fn stale_revocation_sequence_rejected() {
    let (mut ctx, gov, domain) = setup().await;
    let policy_commitment = h32(13);
    let digest = h32(42);
    let (registry, _) = pda(&[REGISTRY_SEED, &domain], &TRUST_REGISTRY_ID);
    let (policy, _) = pda(
        &[POLICY_SEED, registry.as_ref(), &policy_commitment],
        &TRUST_REGISTRY_ID,
    );
    let (commitment_state, _) = pda(
        &[COMMITMENT_SEED, registry.as_ref(), &digest],
        &TRUST_REGISTRY_ID,
    );
    let publisher = Keypair::new();
    let revoker = Keypair::new();
    fund(&mut ctx, &publisher.pubkey(), 2_000_000_000).await;
    fund(&mut ctx, &revoker.pubkey(), 2_000_000_000).await;

    let flow = vec![
        (
            abraxas_trust_registry::instruction::InitializeRegistry { registry_domain: domain }.data(),
            abraxas_trust_registry::accounts::InitializeRegistry {
                governance_authority: gov.pubkey(),
                registry,
                system_program: system_program::ID,
            }
            .to_account_metas(None),
            gov.pubkey(),
            vec![&gov],
        ),
    ];
    for (data, accounts, payer, signers) in flow {
        let ix = Instruction { program_id: TRUST_REGISTRY_ID, accounts, data };
        ctx.banks_client
            .process_transaction(Transaction::new_signed_with_payer(
                &[ix],
                Some(&payer),
                &signers,
                ctx.last_blockhash,
            ))
            .await
            .unwrap();
    }

    // setup minimal through publish + revoke seq 2, then retry seq 2
    for (ix, signers) in [
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::RegisterPolicy {
                    governance_authority: gov.pubkey(),
                    registry,
                    policy,
                    system_program: system_program::ID,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::RegisterPolicy {
                    policy_commitment,
                    policy_version: 1,
                }
                .data(),
            },
            vec![&gov],
        ),
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::RegistryGovernanceMut {
                    governance_authority: gov.pubkey(),
                    registry,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::AddCommitmentPublisher {
                    key_id: h32(1),
                    pubkey: publisher.pubkey().to_bytes(),
                }
                .data(),
            },
            vec![&gov],
        ),
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::RegistryGovernanceMut {
                    governance_authority: gov.pubkey(),
                    registry,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::AddRevoker {
                    key_id: h32(2),
                    pubkey: revoker.pubkey().to_bytes(),
                }
                .data(),
            },
            vec![&gov],
        ),
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::PublishCommitment {
                    publisher: publisher.pubkey(),
                    registry,
                    policy,
                    commitment_state,
                    system_program: system_program::ID,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::PublishCommitment {
                    commitment_digest: digest,
                    sequence: 1,
                }
                .data(),
            },
            vec![&publisher],
        ),
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::RevokeCommitment {
                    revoker: revoker.pubkey(),
                    registry,
                    commitment_state,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::RevokeCommitment { sequence: 2 }.data(),
            },
            vec![&revoker],
        ),
    ] {
        let payer = signers[0].pubkey();
        ctx.banks_client
            .process_transaction(Transaction::new_signed_with_payer(
                &[ix],
                Some(&payer),
                &signers,
                ctx.last_blockhash,
            ))
            .await
            .unwrap();
    }

    let replay = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::RevokeCommitment {
            revoker: revoker.pubkey(),
            registry,
            commitment_state,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::RevokeCommitment { sequence: 1 }.data(),
    };
    let err = ctx
        .banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[replay],
            Some(&revoker.pubkey()),
            &[&revoker],
            ctx.last_blockhash,
        ))
        .await
        .unwrap_err();
    assert!(matches!(err, BanksClientError::TransactionError(_)));

    let account = ctx.banks_client.get_account(commitment_state).await.unwrap().unwrap();
    let state = CommitmentState::try_deserialize(&mut account.data.as_slice()).unwrap();
    assert_eq!(state.status, COMMITMENT_REVOKED);
    assert_ne!(state.status, COMMITMENT_ACTIVE);
}
