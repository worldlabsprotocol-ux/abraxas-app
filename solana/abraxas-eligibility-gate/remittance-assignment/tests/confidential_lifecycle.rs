//! Full confidential transfer lifecycle with real ZK proof instructions in ProgramTest.

use solana_sdk::signature::Signer;
use spl_token_2022::{
    extension::{BaseStateWithExtensions, StateWithExtensions},
    instruction::transfer_checked,
};
use token2022_remittance_assignment::{
    apply_pending, confidential_deposit, confidential_transfer, confidential_withdraw,
    configure_holder_account, create_confidential_ready_token_account,
    create_privacy_remittance_mint, create_privacy_remittance_mint_confidential_lifecycle,
    manual_confidential_approval, thaw_for_simulated_kyc,
    ConfidentialHolderKeys, PublicRemittanceMintSpec, REMITTANCE_DECIMALS,
    harness::{send, token_account_amount, start_program_test_with_zk_proofs},
};

#[tokio::test]
async fn confidential_transfer_lifecycle_with_fee_on_privacy_mint() {
    let mut ctx = start_program_test_with_zk_proofs().await;
    let payer = ctx.payer.insecure_clone();
    let delegate = solana_sdk::signature::Keypair::new();
    let alice = solana_sdk::signature::Keypair::new();
    let bob = solana_sdk::signature::Keypair::new();
    let env =
        create_privacy_remittance_mint_confidential_lifecycle(&mut ctx, &payer, &delegate.pubkey()).await;

    let alice_keys = ConfidentialHolderKeys::new_rand();
    let bob_keys = ConfidentialHolderKeys::new_rand();
    let alice_ata = token2022_remittance_assignment::create_confidential_ready_token_account_with_fee_layout(
        &mut ctx,
        &payer,
        &alice.pubkey(),
        &env.mint,
        false,
    )
    .await;
    let bob_ata = token2022_remittance_assignment::create_confidential_ready_token_account_with_fee_layout(
        &mut ctx,
        &payer,
        &bob.pubkey(),
        &env.mint,
        false,
    )
    .await;

    configure_holder_account(&mut ctx, &payer, &alice, &alice_ata, &env.mint, &alice_keys).await;
    configure_holder_account(&mut ctx, &payer, &bob, &bob_ata, &env.mint, &bob_keys).await;

    manual_confidential_approval(
        &mut ctx,
        &payer,
        &alice_ata,
        &env.mint,
        &env.confidential_transfer_authority,
    )
    .await;
    manual_confidential_approval(
        &mut ctx,
        &payer,
        &bob_ata,
        &env.mint,
        &env.confidential_transfer_authority,
    )
    .await;

    for acct in [alice_ata, bob_ata] {
        thaw_for_simulated_kyc(&mut ctx, &payer, &acct, &env.mint, &env.freeze_authority).await;
    }

    let mint_ix = spl_token_2022::instruction::mint_to(
        &spl_token_2022::id(),
        &env.mint,
        &alice_ata,
        &env.mint_authority,
        &[],
        1_000_000,
    )
    .unwrap();
    send(&mut ctx, vec![mint_ix], &[&payer]).await.unwrap();

    confidential_deposit(
        &mut ctx,
        &payer,
        &alice,
        &alice_ata,
        &env.mint,
        1_000_000,
        REMITTANCE_DECIMALS,
    )
    .await;
    assert_eq!(token_account_amount(&mut ctx, alice_ata).await, 0);

    apply_pending(&mut ctx, &payer, &alice, &alice_ata, &alice_keys).await;

    confidential_transfer(
        &mut ctx,
        &payer,
        &alice,
        &alice_ata,
        &bob_ata,
        &env.mint,
        &alice_keys,
        &bob_keys.elgamal.pubkey(),
        400_000,
    )
    .await;

    apply_pending(&mut ctx, &payer, &bob, &bob_ata, &bob_keys).await;

    confidential_withdraw(
        &mut ctx,
        &payer,
        &bob,
        &bob_ata,
        &env.mint,
        &bob_keys,
        100_000,
        REMITTANCE_DECIMALS,
    )
    .await;

    assert_eq!(token_account_amount(&mut ctx, bob_ata).await, 100_000);

    // PermanentDelegate cannot move funds after public balance was deposited into confidential state.
    let seize = transfer_checked(
        &spl_token_2022::id(),
        &alice_ata,
        &env.mint,
        &bob_ata,
        &delegate.pubkey(),
        &[],
        1,
        REMITTANCE_DECIMALS,
    )
    .unwrap();
    assert!(
        send(&mut ctx, vec![seize], &[&payer, &delegate]).await.is_err(),
        "PermanentDelegate must not recover encrypted confidential balances via public transfer"
    );
}

#[tokio::test]
async fn confidential_configure_rejected_without_manual_approval() {
    let mut ctx = start_program_test_with_zk_proofs().await;
    let payer = ctx.payer.insecure_clone();
    let delegate = solana_sdk::signature::Keypair::new();
    let holder = solana_sdk::signature::Keypair::new();
    let env = create_privacy_remittance_mint(
        &mut ctx,
        &payer,
        &delegate.pubkey(),
        PublicRemittanceMintSpec {
            transfer_fee_basis_points: 0,
            maximum_fee: 0,
        },
    )
    .await;
    let ata = create_confidential_ready_token_account(&mut ctx, &payer, &holder.pubkey(), &env.mint).await;
    let keys = ConfidentialHolderKeys::new_rand();
    configure_holder_account(&mut ctx, &payer, &holder, &ata, &env.mint, &keys).await;

    let data = ctx.banks_client.get_account(ata).await.unwrap().unwrap().data;
    let acct = StateWithExtensions::<spl_token_2022::state::Account>::unpack(&data).unwrap();
    let ct = acct
        .get_extension::<spl_token_2022::extension::confidential_transfer::ConfidentialTransferAccount>()
        .unwrap();
    assert!(!bool::from(ct.approved));

    thaw_for_simulated_kyc(&mut ctx, &payer, &ata, &env.mint, &env.freeze_authority).await;
    let deposit_ix = spl_token_2022::extension::confidential_transfer::instruction::deposit(
        &spl_token_2022::id(),
        &ata,
        &env.mint,
        1,
        REMITTANCE_DECIMALS,
        &holder.pubkey(),
        &[],
    )
    .unwrap();
    assert!(
        send(&mut ctx, vec![deposit_ix], &[&payer, &holder]).await.is_err(),
        "unapproved confidential account must not accept deposits"
    );
}