//! Negative confidential-transfer cases on the combined privacy mint.

use solana_sdk::signature::Signer;
use spl_token_2022::extension::BaseStateWithExtensions;
use solana_zk_token_sdk::encryption::elgamal::ElGamalPubkey;
use spl_token_2022::proof::ProofLocation;
use std::num::NonZeroI8;
use token2022_remittance_assignment::{
    apply_pending, confidential_deposit, configure_holder_account, create_confidential_ready_token_account,
    create_privacy_remittance_mint, manual_confidential_approval, thaw_for_simulated_kyc,
    withheld_authority_pubkey, ConfidentialHolderKeys, PublicRemittanceMintSpec, REMITTANCE_DECIMALS,
    harness::{send, start_program_test_with_zk_proofs},
};

#[tokio::test]
async fn confidential_transfer_with_fee_rejects_wrong_fee_parameters_in_proof() {
    let mut ctx = start_program_test_with_zk_proofs().await;
    let payer = ctx.payer.insecure_clone();
    let delegate = solana_sdk::signature::Keypair::new();
    let alice = solana_sdk::signature::Keypair::new();
    let bob = solana_sdk::signature::Keypair::new();
    let env = create_privacy_remittance_mint(
        &mut ctx,
        &payer,
        &delegate.pubkey(),
        PublicRemittanceMintSpec {
            transfer_fee_basis_points: 50,
            maximum_fee: 1_000_000,
        },
    )
    .await;

    let alice_keys = ConfidentialHolderKeys::new_rand();
    let bob_keys = ConfidentialHolderKeys::new_rand();
    let alice_ata = create_confidential_ready_token_account(&mut ctx, &payer, &alice.pubkey(), &env.mint).await;
    let bob_ata = create_confidential_ready_token_account(&mut ctx, &payer, &bob.pubkey(), &env.mint).await;
    configure_holder_account(&mut ctx, &payer, &alice, &alice_ata, &env.mint, &alice_keys).await;
    configure_holder_account(&mut ctx, &payer, &bob, &bob_ata, &env.mint, &bob_keys).await;
    manual_confidential_approval(&mut ctx, &payer, &alice_ata, &env.mint, &env.confidential_transfer_authority).await;
    manual_confidential_approval(&mut ctx, &payer, &bob_ata, &env.mint, &env.confidential_transfer_authority).await;
    for acct in [alice_ata, bob_ata] {
        thaw_for_simulated_kyc(&mut ctx, &payer, &acct, &env.mint, &env.freeze_authority).await;
    }
    let mint_ix = spl_token_2022::instruction::mint_to(
        &spl_token_2022::id(),
        &env.mint,
        &alice_ata,
        &env.mint_authority,
        &[],
        500_000,
    )
    .unwrap();
    send(&mut ctx, vec![mint_ix], &[&payer]).await.unwrap();
    confidential_deposit(
        &mut ctx,
        &payer,
        &alice,
        &alice_ata,
        &env.mint,
        500_000,
        REMITTANCE_DECIMALS,
    )
    .await;
    apply_pending(&mut ctx, &payer, &alice, &alice_ata, &alice_keys).await;

    let source_data = ctx.banks_client.get_account(alice_ata).await.unwrap().unwrap().data;
    let extension = spl_token_2022::extension::StateWithExtensions::<spl_token_2022::state::Account>::unpack(
        &source_data,
    )
    .unwrap()
    .get_extension::<spl_token_2022::extension::confidential_transfer::ConfidentialTransferAccount>()
    .unwrap()
    .clone();
    let transfer_info =
        spl_token_2022::extension::confidential_transfer::account_info::TransferAccountInfo::new(&extension);
    let withheld: ElGamalPubkey = withheld_authority_pubkey(&env);
    // Deliberately wrong fee parameters vs mint (250 bps instead of 50).
    let proof_data = transfer_info
        .generate_transfer_with_fee_proof_data(
            100_000,
            &alice_keys.elgamal,
            &alice_keys.aes,
            &bob_keys.elgamal.pubkey(),
            None,
            &withheld,
            250,
            1_000_000,
        )
        .expect("proof bytes");

    let context = token2022_remittance_assignment::proof_context::create_and_verify_transfer_with_fee_context(
        &mut ctx,
        &payer,
        &payer.pubkey(),
        &proof_data,
    )
    .await;

    let new_decryptable = transfer_info
        .new_decryptable_available_balance(100_000, &alice_keys.aes)
        .unwrap();
    let ix = spl_token_2022::extension::confidential_transfer::instruction::inner_transfer_with_fee(
        &spl_token_2022::id(),
        &alice_ata,
        &env.mint,
        &bob_ata,
        new_decryptable.into(),
        &alice.pubkey(),
        &[],
        ProofLocation::ContextStateAccount(&context.pubkey),
    )
    .unwrap();
    assert!(
        send(&mut ctx, vec![ix], &[&payer, &alice]).await.is_err(),
        "transfer must fail when proof fee parameters disagree with mint"
    );
}

#[tokio::test]
async fn inline_confidential_transfer_rejects_invalid_proof_instruction() {
    let mut ctx = start_program_test_with_zk_proofs().await;
    let payer = ctx.payer.insecure_clone();
    let delegate = solana_sdk::signature::Keypair::new();
    let alice = solana_sdk::signature::Keypair::new();
    let bob = solana_sdk::signature::Keypair::new();
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
    let alice_keys = ConfidentialHolderKeys::new_rand();
    let bob_keys = ConfidentialHolderKeys::new_rand();
    let alice_ata = create_confidential_ready_token_account(&mut ctx, &payer, &alice.pubkey(), &env.mint).await;
    let bob_ata = create_confidential_ready_token_account(&mut ctx, &payer, &bob.pubkey(), &env.mint).await;
    configure_holder_account(&mut ctx, &payer, &alice, &alice_ata, &env.mint, &alice_keys).await;
    configure_holder_account(&mut ctx, &payer, &bob, &bob_ata, &env.mint, &bob_keys).await;
    manual_confidential_approval(&mut ctx, &payer, &alice_ata, &env.mint, &env.confidential_transfer_authority).await;
    manual_confidential_approval(&mut ctx, &payer, &bob_ata, &env.mint, &env.confidential_transfer_authority).await;
    thaw_for_simulated_kyc(&mut ctx, &payer, &alice_ata, &env.mint, &env.freeze_authority).await;
    send(
        &mut ctx,
        vec![spl_token_2022::instruction::mint_to(
            &spl_token_2022::id(),
            &env.mint,
            &alice_ata,
            &env.mint_authority,
            &[],
            100_000,
        )
        .unwrap()],
        &[&payer],
    )
    .await
    .unwrap();
    confidential_deposit(
        &mut ctx,
        &payer,
        &alice,
        &alice_ata,
        &env.mint,
        100_000,
        REMITTANCE_DECIMALS,
    )
    .await;
    apply_pending(&mut ctx, &payer, &alice, &alice_ata, &alice_keys).await;

    let source_data = ctx.banks_client.get_account(alice_ata).await.unwrap().unwrap().data;
    let extension = spl_token_2022::extension::StateWithExtensions::<spl_token_2022::state::Account>::unpack(
        &source_data,
    )
    .unwrap()
    .get_extension::<spl_token_2022::extension::confidential_transfer::ConfidentialTransferAccount>()
    .unwrap()
    .clone();
    let transfer_info =
        spl_token_2022::extension::confidential_transfer::account_info::TransferAccountInfo::new(&extension);
    let proof_data = transfer_info
        .generate_transfer_proof_data(10_000, &alice_keys.elgamal, &alice_keys.aes, &bob_keys.elgamal.pubkey(), None)
        .unwrap();
    let new_decryptable = transfer_info.new_decryptable_available_balance(99_999, &alice_keys.aes).unwrap();
    let ixs = spl_token_2022::extension::confidential_transfer::instruction::transfer(
        &spl_token_2022::id(),
        &alice_ata,
        &env.mint,
        &bob_ata,
        new_decryptable,
        &alice.pubkey(),
        &[],
        ProofLocation::InstructionOffset(NonZeroI8::new(1).unwrap(), &proof_data),
    )
    .unwrap();
    assert!(
        send(&mut ctx, ixs, &[&payer, &alice]).await.is_err(),
        "corrupted ZK proof must be rejected"
    );
}