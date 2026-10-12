//! Build #536 — legacy v535 registry layout remains operable after program upgrade (no extend required for policy/commitment ops).
use abraxas_trust_registry::{
    CommitmentState, COMMITMENT_ACTIVE, TRUST_REGISTRY_LEGACY_INIT_SPACE, ID as TRUST_REGISTRY_ID,
    REGISTRY_SEED,
};
use anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas};
use solana_program_test::{processor, ProgramTest, ProgramTestContext};
use solana_sdk::{
    account::AccountSharedData,
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

#[tokio::test]
async fn legacy_registry_publish_without_extend_succeeds() {
    let mut test = ProgramTest::default();
    test.add_program(
        "abraxas_trust_registry",
        TRUST_REGISTRY_ID,
        processor!(trust_registry_process),
    );
    let mut ctx = test.start_with_context().await;
    let gov = Keypair::new();
    let publisher = Keypair::new();
    fund(&mut ctx, &gov.pubkey(), 5_000_000_000).await;
    fund(&mut ctx, &publisher.pubkey(), 2_000_000_000).await;
    let domain = h32(20);
    let policy_commitment = h32(21);
    let digest = h32(22);

    let (registry, _) = Pubkey::find_program_address(&[REGISTRY_SEED, &domain], &TRUST_REGISTRY_ID);

    let init = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::InitializeRegistry {
            governance_authority: gov.pubkey(),
            registry,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::InitializeRegistry { registry_domain: domain }.data(),
    };
    ctx.banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[init],
            Some(&gov.pubkey()),
            &[&gov],
            ctx.last_blockhash,
        ))
        .await
        .unwrap();

    // Simulate post-upgrade v535 on-chain body (463 B) while running #536 program.
    let reg_account = ctx.banks_client.get_account(registry).await.unwrap().unwrap();
    let mut legacy_data = reg_account.data.clone();
    legacy_data.truncate(8 + TRUST_REGISTRY_LEGACY_INIT_SPACE);
    let mut legacy = AccountSharedData::new(reg_account.lamports, legacy_data.len(), &TRUST_REGISTRY_ID);
    legacy.set_data_from_slice(&legacy_data);
    ctx.set_account(&registry, &legacy);

    let (policy, _) = Pubkey::find_program_address(
        &[b"trust_policy", registry.as_ref(), &policy_commitment],
        &TRUST_REGISTRY_ID,
    );
    let (commitment_state, _) = Pubkey::find_program_address(
        &[b"trust_commitment", registry.as_ref(), &digest],
        &TRUST_REGISTRY_ID,
    );

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
                    registry_domain: domain,
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
                    registry_domain: domain,
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
                    registry_domain: domain,
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

    let account = ctx.banks_client.get_account(registry).await.unwrap().unwrap();
    assert_eq!(account.data.len(), 8 + TRUST_REGISTRY_LEGACY_INIT_SPACE);

    let cs_account = ctx.banks_client.get_account(commitment_state).await.unwrap().unwrap();
    let cs = CommitmentState::try_deserialize(&mut cs_account.data.as_slice()).unwrap();
    assert_eq!(cs.status, COMMITMENT_ACTIVE);
    assert_eq!(cs.sequence, 1);
}
