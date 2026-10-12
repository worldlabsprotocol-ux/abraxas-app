use abraxas_trust_registry::{
    TrustRegistry, GOVERNANCE_NOMINATION_TTL_SLOTS, ID as TRUST_REGISTRY_ID, REGISTRY_SEED,
};
use anchor_lang::{AccountDeserialize, InstructionData, Space, ToAccountMetas};
use solana_program_test::{
    processor, BanksClientError, ProgramTest, ProgramTestBanksClientExt, ProgramTestContext,
};
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

async fn setup_registry(ctx: &mut ProgramTestContext, gov: &Keypair, domain: [u8; 32]) -> Pubkey {
    let (registry, _) = pda(&[REGISTRY_SEED, &domain], &TRUST_REGISTRY_ID);
    let ix = Instruction {
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
            &[ix],
            Some(&gov.pubkey()),
            &[gov],
            ctx.last_blockhash,
        ))
        .await
        .unwrap();
    registry
}

#[tokio::test]
async fn governance_transfer_nominate_accept_succeeds() {
    let mut test = ProgramTest::default();
    test.add_program(
        "abraxas_trust_registry",
        TRUST_REGISTRY_ID,
        processor!(trust_registry_process),
    );
    let mut ctx = test.start_with_context().await;
    let gov = Keypair::new();
    let successor = Keypair::new();
    fund(&mut ctx, &gov.pubkey(), 5_000_000_000).await;
    fund(&mut ctx, &successor.pubkey(), 1_000_000_000).await;
    let domain = h32(7);
    let registry = setup_registry(&mut ctx, &gov, domain).await;

    let nominate = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::NominateGovernanceAuthority {
            governance_authority: gov.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::NominateGovernanceAuthority {
            new_authority: successor.pubkey(),
            transfer_seq: 1,
        }
        .data(),
    };
    ctx.banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[nominate],
            Some(&gov.pubkey()),
            &[&gov],
            ctx.last_blockhash,
        ))
        .await
        .unwrap();

    let accept = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::AcceptGovernanceAuthority {
            pending_authority: successor.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::AcceptGovernanceAuthority { transfer_seq: 1 }.data(),
    };
    ctx.banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[accept],
            Some(&successor.pubkey()),
            &[&successor],
            ctx.last_blockhash,
        ))
        .await
        .unwrap();

    let account = ctx.banks_client.get_account(registry).await.unwrap().unwrap();
    let state = TrustRegistry::try_deserialize(&mut account.data.as_slice()).unwrap();
    assert_eq!(state.governance_authority, successor.pubkey());
    assert_eq!(state.governance_transfer_seq, 1);
    assert_eq!(state.pending_governance, Pubkey::default());
}

#[tokio::test]
async fn unauthorized_accept_rejected() {
    let mut test = ProgramTest::default();
    test.add_program(
        "abraxas_trust_registry",
        TRUST_REGISTRY_ID,
        processor!(trust_registry_process),
    );
    let mut ctx = test.start_with_context().await;
    let gov = Keypair::new();
    let successor = Keypair::new();
    let attacker = Keypair::new();
    fund(&mut ctx, &gov.pubkey(), 5_000_000_000).await;
    fund(&mut ctx, &attacker.pubkey(), 1_000_000_000).await;
    let domain = h32(8);
    let registry = setup_registry(&mut ctx, &gov, domain).await;

    let nominate = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::NominateGovernanceAuthority {
            governance_authority: gov.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::NominateGovernanceAuthority {
            new_authority: successor.pubkey(),
            transfer_seq: 1,
        }
        .data(),
    };
    ctx.banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[nominate],
            Some(&gov.pubkey()),
            &[&gov],
            ctx.last_blockhash,
        ))
        .await
        .unwrap();

    let accept = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::AcceptGovernanceAuthority {
            pending_authority: attacker.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::AcceptGovernanceAuthority { transfer_seq: 1 }.data(),
    };
    let err = ctx
        .banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[accept],
            Some(&attacker.pubkey()),
            &[&attacker],
            ctx.last_blockhash,
        ))
        .await
        .unwrap_err();
    assert!(matches!(err, BanksClientError::TransactionError(_)));
}

#[tokio::test]
async fn stale_transfer_sequence_rejected() {
    let mut test = ProgramTest::default();
    test.add_program(
        "abraxas_trust_registry",
        TRUST_REGISTRY_ID,
        processor!(trust_registry_process),
    );
    let mut ctx = test.start_with_context().await;
    let gov = Keypair::new();
    let successor = Keypair::new();
    fund(&mut ctx, &gov.pubkey(), 5_000_000_000).await;
    let domain = h32(9);
    let registry = setup_registry(&mut ctx, &gov, domain).await;

    let nominate = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::NominateGovernanceAuthority {
            governance_authority: gov.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::NominateGovernanceAuthority {
            new_authority: successor.pubkey(),
            transfer_seq: 99,
        }
        .data(),
    };
    let err = ctx
        .banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[nominate],
            Some(&gov.pubkey()),
            &[&gov],
            ctx.last_blockhash,
        ))
        .await
        .unwrap_err();
    assert!(matches!(err, BanksClientError::TransactionError(_)));
}

#[tokio::test]
async fn cancel_nomination_blocks_accept() {
    let mut test = ProgramTest::default();
    test.add_program(
        "abraxas_trust_registry",
        TRUST_REGISTRY_ID,
        processor!(trust_registry_process),
    );
    let mut ctx = test.start_with_context().await;
    let gov = Keypair::new();
    let successor = Keypair::new();
    fund(&mut ctx, &gov.pubkey(), 5_000_000_000).await;
    fund(&mut ctx, &successor.pubkey(), 1_000_000_000).await;
    let domain = h32(10);
    let registry = setup_registry(&mut ctx, &gov, domain).await;

    for (ix, signers) in [
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::NominateGovernanceAuthority {
                    governance_authority: gov.pubkey(),
                    registry,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::NominateGovernanceAuthority {
                    new_authority: successor.pubkey(),
                    transfer_seq: 1,
                }
                .data(),
            },
            vec![&gov],
        ),
        (
            Instruction {
                program_id: TRUST_REGISTRY_ID,
                accounts: abraxas_trust_registry::accounts::CancelGovernanceNomination {
                    governance_authority: gov.pubkey(),
                    registry,
                }
                .to_account_metas(None),
                data: abraxas_trust_registry::instruction::CancelGovernanceNomination {}.data(),
            },
            vec![&gov],
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

    let accept = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::AcceptGovernanceAuthority {
            pending_authority: successor.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::AcceptGovernanceAuthority { transfer_seq: 1 }.data(),
    };
    let err = ctx
        .banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[accept],
            Some(&successor.pubkey()),
            &[&successor],
            ctx.last_blockhash,
        ))
        .await
        .unwrap_err();
    assert!(matches!(err, BanksClientError::TransactionError(_)));
}

#[tokio::test]
async fn nomination_ttl_constant_is_nonzero() {
    assert!(GOVERNANCE_NOMINATION_TTL_SLOTS > 0);
}

async fn nominate_and_accept(
    ctx: &mut ProgramTestContext,
    gov: &Keypair,
    successor: &Keypair,
    registry: Pubkey,
    transfer_seq: u64,
) {
    let nominate = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::NominateGovernanceAuthority {
            governance_authority: gov.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::NominateGovernanceAuthority {
            new_authority: successor.pubkey(),
            transfer_seq,
        }
        .data(),
    };
    ctx.banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[nominate],
            Some(&gov.pubkey()),
            &[gov],
            ctx.last_blockhash,
        ))
        .await
        .unwrap();

    let accept = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::AcceptGovernanceAuthority {
            pending_authority: successor.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::AcceptGovernanceAuthority { transfer_seq }.data(),
    };
    ctx.banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[accept],
            Some(&successor.pubkey()),
            &[successor],
            ctx.last_blockhash,
        ))
        .await
        .unwrap();
}

#[tokio::test]
async fn expire_nomination_blocks_accept() {
    let mut test = ProgramTest::default();
    test.add_program(
        "abraxas_trust_registry",
        TRUST_REGISTRY_ID,
        processor!(trust_registry_process),
    );
    let mut ctx = test.start_with_context().await;
    let gov = Keypair::new();
    let successor = Keypair::new();
    fund(&mut ctx, &gov.pubkey(), 5_000_000_000).await;
    fund(&mut ctx, &successor.pubkey(), 1_000_000_000).await;
    let domain = h32(15);
    let registry = setup_registry(&mut ctx, &gov, domain).await;

    let nominate = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::NominateGovernanceAuthority {
            governance_authority: gov.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::NominateGovernanceAuthority {
            new_authority: successor.pubkey(),
            transfer_seq: 1,
        }
        .data(),
    };
    ctx.banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[nominate],
            Some(&gov.pubkey()),
            &[&gov],
            ctx.last_blockhash,
        ))
        .await
        .unwrap();

    let slot = ctx.banks_client.get_root_slot().await.unwrap();
    ctx.warp_to_slot(slot + GOVERNANCE_NOMINATION_TTL_SLOTS + 10)
        .unwrap();
    ctx.last_blockhash = ctx
        .banks_client
        .get_new_latest_blockhash(&ctx.last_blockhash)
        .await
        .unwrap();

    let expire = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::ExpireGovernanceNomination { registry }
            .to_account_metas(None),
        data: abraxas_trust_registry::instruction::ExpireGovernanceNomination {}.data(),
    };
    ctx.banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[expire],
            Some(&ctx.payer.pubkey()),
            &[&ctx.payer],
            ctx.last_blockhash,
        ))
        .await
        .unwrap();

    let accept = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::AcceptGovernanceAuthority {
            pending_authority: successor.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::AcceptGovernanceAuthority { transfer_seq: 1 }.data(),
    };
    let err = ctx
        .banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[accept],
            Some(&successor.pubkey()),
            &[&successor],
            ctx.last_blockhash,
        ))
        .await
        .unwrap_err();
    assert!(matches!(err, BanksClientError::TransactionError(_)));
}

#[tokio::test]
async fn replay_accept_after_transfer_rejected() {
    let mut test = ProgramTest::default();
    test.add_program(
        "abraxas_trust_registry",
        TRUST_REGISTRY_ID,
        processor!(trust_registry_process),
    );
    let mut ctx = test.start_with_context().await;
    let gov = Keypair::new();
    let successor = Keypair::new();
    fund(&mut ctx, &gov.pubkey(), 5_000_000_000).await;
    fund(&mut ctx, &successor.pubkey(), 1_000_000_000).await;
    let domain = h32(11);
    let registry = setup_registry(&mut ctx, &gov, domain).await;
    nominate_and_accept(&mut ctx, &gov, &successor, registry, 1).await;
    ctx.last_blockhash = ctx
        .banks_client
        .get_new_latest_blockhash(&ctx.last_blockhash)
        .await
        .unwrap();

    let accept = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::AcceptGovernanceAuthority {
            pending_authority: successor.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::AcceptGovernanceAuthority { transfer_seq: 1 }.data(),
    };
    let err = ctx
        .banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[accept],
            Some(&successor.pubkey()),
            &[&successor],
            ctx.last_blockhash,
        ))
        .await
        .unwrap_err();
    assert!(matches!(err, BanksClientError::TransactionError(_)));
}

#[tokio::test]
async fn unauthorized_nominate_rejected() {
    let mut test = ProgramTest::default();
    test.add_program(
        "abraxas_trust_registry",
        TRUST_REGISTRY_ID,
        processor!(trust_registry_process),
    );
    let mut ctx = test.start_with_context().await;
    let gov = Keypair::new();
    let attacker = Keypair::new();
    let successor = Keypair::new();
    fund(&mut ctx, &gov.pubkey(), 5_000_000_000).await;
    fund(&mut ctx, &attacker.pubkey(), 1_000_000_000).await;
    let domain = h32(12);
    let registry = setup_registry(&mut ctx, &gov, domain).await;

    let nominate = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::NominateGovernanceAuthority {
            governance_authority: attacker.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::NominateGovernanceAuthority {
            new_authority: successor.pubkey(),
            transfer_seq: 1,
        }
        .data(),
    };
    let err = ctx
        .banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[nominate],
            Some(&attacker.pubkey()),
            &[&attacker],
            ctx.last_blockhash,
        ))
        .await
        .unwrap_err();
    assert!(matches!(err, BanksClientError::TransactionError(_)));
}

#[tokio::test]
async fn nominate_multisig_vault_pda_succeeds() {
    // Nomination target may be a Squads vault PDA; accept must be invoked with vault PDA signed (Squads CPI — not exercised here).
    let squads_program = Pubkey::new_unique();
    let (squads_vault, _) = Pubkey::find_program_address(&[b"vault", &[0u8; 32]], &squads_program);

    let mut test = ProgramTest::default();
    test.add_program(
        "abraxas_trust_registry",
        TRUST_REGISTRY_ID,
        processor!(trust_registry_process),
    );
    let mut ctx = test.start_with_context().await;
    let gov = Keypair::new();
    fund(&mut ctx, &gov.pubkey(), 5_000_000_000).await;
    let domain = h32(13);
    let registry = setup_registry(&mut ctx, &gov, domain).await;

    let nominate = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::NominateGovernanceAuthority {
            governance_authority: gov.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::NominateGovernanceAuthority {
            new_authority: squads_vault,
            transfer_seq: 1,
        }
        .data(),
    };
    ctx.banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[nominate],
            Some(&gov.pubkey()),
            &[&gov],
            ctx.last_blockhash,
        ))
        .await
        .unwrap();

    let account = ctx.banks_client.get_account(registry).await.unwrap().unwrap();
    let state = TrustRegistry::try_deserialize(&mut account.data.as_slice()).unwrap();
    assert_eq!(state.pending_governance, squads_vault);
    assert_eq!(state.pending_transfer_seq, 1);
}

#[tokio::test]
async fn legacy_layout_extend_then_transfer() {
    let mut test = ProgramTest::default();
    test.add_program(
        "abraxas_trust_registry",
        TRUST_REGISTRY_ID,
        processor!(trust_registry_process),
    );
    let mut ctx = test.start_with_context().await;
    let gov = Keypair::new();
    let successor = Keypair::new();
    fund(&mut ctx, &gov.pubkey(), 5_000_000_000).await;
    fund(&mut ctx, &successor.pubkey(), 1_000_000_000).await;
    let domain = h32(14);
    let registry = setup_registry(&mut ctx, &gov, domain).await;

    // Simulate v535 on-chain account size before migration upgrade.
    let reg_account = ctx.banks_client.get_account(registry).await.unwrap().unwrap();
    let mut legacy_data = reg_account.data.clone();
    legacy_data.truncate(8 + abraxas_trust_registry::TRUST_REGISTRY_LEGACY_INIT_SPACE);
    let mut legacy = AccountSharedData::new(
        reg_account.lamports,
        legacy_data.len(),
        &TRUST_REGISTRY_ID,
    );
    legacy.set_data_from_slice(&legacy_data);
    ctx.set_account(&registry, &legacy);

    let nominate = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::NominateGovernanceAuthority {
            governance_authority: gov.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::NominateGovernanceAuthority {
            new_authority: successor.pubkey(),
            transfer_seq: 1,
        }
        .data(),
    };
    let err = ctx
        .banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[nominate],
            Some(&gov.pubkey()),
            &[&gov],
            ctx.last_blockhash,
        ))
        .await
        .unwrap_err();
    assert!(matches!(err, BanksClientError::TransactionError(_)));

    let extend = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::ExtendRegistryGovernanceLayout {
            governance_authority: gov.pubkey(),
            registry,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::ExtendRegistryGovernanceLayout { registry_domain: domain }
            .data(),
    };
    ctx.banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[extend],
            Some(&gov.pubkey()),
            &[&gov],
            ctx.last_blockhash,
        ))
        .await
        .unwrap();

    let extended = ctx.banks_client.get_account(registry).await.unwrap().unwrap();
    assert_eq!(extended.data.len(), 8 + TrustRegistry::INIT_SPACE);
    TrustRegistry::try_deserialize(&mut extended.data.as_slice()).expect("extended registry deserializes");
    ctx.last_blockhash = ctx
        .banks_client
        .get_new_latest_blockhash(&ctx.last_blockhash)
        .await
        .unwrap();

    nominate_and_accept(&mut ctx, &gov, &successor, registry, 1).await;
    let account = ctx.banks_client.get_account(registry).await.unwrap().unwrap();
    let state = TrustRegistry::try_deserialize(&mut account.data.as_slice()).unwrap();
    assert_eq!(state.governance_authority, successor.pubkey());
}
