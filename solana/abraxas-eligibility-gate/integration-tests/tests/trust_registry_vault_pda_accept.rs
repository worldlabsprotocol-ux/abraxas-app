//! Build #537 — vault PDA invoke_signed accept (Squads-isomorphic seeds, local rehearsal program).

use abraxas_trust_registry::{
    TrustRegistry, ID as TRUST_REGISTRY_ID, REGISTRY_SEED,
};
use anchor_lang::{AccountDeserialize, InstructionData, Space, ToAccountMetas};
use governance_vault_rehearsal::ID as REHEARSAL_ID;
use solana_program_test::{
    processor, BanksClientError, ProgramTest, ProgramTestBanksClientExt, ProgramTestContext,
};
use solana_sdk::{
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
    transaction::Transaction,
};

fn trust_registry_process<'a, 'b, 'c, 'd>(
    program_id: &'a Pubkey,
    accounts: &'b [solana_sdk::account_info::AccountInfo<'c>],
    data: &'d [u8],
) -> solana_sdk::entrypoint::ProgramResult {
    abraxas_trust_registry::entry(
        unsafe { &*(program_id as *const Pubkey) },
        unsafe {
            &*(accounts as *const [solana_sdk::account_info::AccountInfo<'c>]
                as *const [solana_sdk::account_info::AccountInfo])
        },
        data,
    )
}

fn rehearsal_process<'a, 'b, 'c, 'd>(
    program_id: &'a Pubkey,
    accounts: &'b [solana_sdk::account_info::AccountInfo<'c>],
    data: &'d [u8],
) -> solana_sdk::entrypoint::ProgramResult {
    governance_vault_rehearsal::entry(
        unsafe { &*(program_id as *const Pubkey) },
        unsafe {
            &*(accounts as *const [solana_sdk::account_info::AccountInfo<'c>]
                as *const [solana_sdk::account_info::AccountInfo])
        },
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

fn rehearsal_vault(multisig: &Pubkey, vault_index: u8) -> (Pubkey, u8) {
    pda(
        &[
            b"multisig",
            multisig.as_ref(),
            b"vault",
            &[vault_index],
        ],
        &REHEARSAL_ID,
    )
}

#[tokio::test]
async fn vault_pda_cpi_accept_governance_succeeds() {
    let mut test = ProgramTest::default();
    test.add_program(
        "abraxas_trust_registry",
        TRUST_REGISTRY_ID,
        processor!(trust_registry_process),
    );
    test.add_program(
        "governance_vault_rehearsal",
        REHEARSAL_ID,
        processor!(rehearsal_process),
    );
    let mut ctx = test.start_with_context().await;
    let gov = Keypair::new();
    fund(&mut ctx, &gov.pubkey(), 5_000_000_000).await;
    let domain = h32(21);
    let registry = setup_registry(&mut ctx, &gov, domain).await;

    let multisig_marker = Keypair::new().pubkey();
    let (vault, _vault_bump) = rehearsal_vault(&multisig_marker, 0);

    let nominate = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::NominateGovernanceAuthority {
            governance_authority: gov.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::NominateGovernanceAuthority {
            new_authority: vault,
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

    let execute = Instruction {
        program_id: REHEARSAL_ID,
        accounts: governance_vault_rehearsal::accounts::ExecuteAcceptViaVault {
            payer: ctx.payer.pubkey(),
            vault,
            registry,
            trust_registry_program: TRUST_REGISTRY_ID,
        }
        .to_account_metas(None),
        data: governance_vault_rehearsal::instruction::ExecuteAcceptGovernanceViaVault {
            multisig: multisig_marker,
            vault_index: 0,
            transfer_seq: 1,
        }
        .data(),
    };
    ctx.banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[execute],
            Some(&ctx.payer.pubkey()),
            &[&ctx.payer],
            ctx.last_blockhash,
        ))
        .await
        .unwrap();

    let account = ctx.banks_client.get_account(registry).await.unwrap().unwrap();
    let state = TrustRegistry::try_deserialize(&mut account.data.as_slice()).unwrap();
    assert_eq!(state.governance_authority, vault);
    assert_eq!(state.governance_transfer_seq, 1);
    assert_eq!(state.pending_governance, Pubkey::default());
}

#[tokio::test]
async fn wallet_cannot_accept_for_vault_pda() {
    let mut test = ProgramTest::default();
    test.add_program(
        "abraxas_trust_registry",
        TRUST_REGISTRY_ID,
        processor!(trust_registry_process),
    );
    let mut ctx = test.start_with_context().await;
    let gov = Keypair::new();
    let impostor = Keypair::new();
    fund(&mut ctx, &gov.pubkey(), 5_000_000_000).await;
    fund(&mut ctx, &impostor.pubkey(), 1_000_000_000).await;
    let domain = h32(22);
    let registry = setup_registry(&mut ctx, &gov, domain).await;

    let multisig_marker = Keypair::new().pubkey();
    let (vault, _) = rehearsal_vault(&multisig_marker, 0);

    let nominate = Instruction {
        program_id: TRUST_REGISTRY_ID,
        accounts: abraxas_trust_registry::accounts::NominateGovernanceAuthority {
            governance_authority: gov.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::NominateGovernanceAuthority {
            new_authority: vault,
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
            pending_authority: impostor.pubkey(),
            registry,
        }
        .to_account_metas(None),
        data: abraxas_trust_registry::instruction::AcceptGovernanceAuthority { transfer_seq: 1 }.data(),
    };
    let err = ctx
        .banks_client
        .process_transaction(Transaction::new_signed_with_payer(
            &[accept],
            Some(&impostor.pubkey()),
            &[&impostor],
            ctx.last_blockhash,
        ))
        .await
        .unwrap_err();
    assert!(matches!(err, BanksClientError::TransactionError(_)));
}
