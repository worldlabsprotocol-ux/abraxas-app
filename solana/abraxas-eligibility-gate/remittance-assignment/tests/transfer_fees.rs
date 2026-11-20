use solana_sdk::signature::Signer;
use token2022_remittance_assignment::{
    create_public_remittance_mint, create_token_account, epoch_transfer_fee, mint_tokens,
    transfer_with_epoch_fee_ix, PublicRemittanceMintSpec, REMITTANCE_DECIMALS, start_program_test,
    harness::send,
};

#[tokio::test]
async fn transfer_checked_with_fee_uses_epoch_calculation() {
    let mut ctx = start_program_test().await;
    let payer = ctx.payer.insecure_clone();
    let env = create_public_remittance_mint(
        &mut ctx,
        &payer,
        PublicRemittanceMintSpec {
            transfer_fee_basis_points: 250,
            maximum_fee: 1_000_000,
        },
    )
    .await;
    let holder_a = solana_sdk::signature::Keypair::new();
    let holder_b = solana_sdk::signature::Keypair::new();
    let ata_a = create_token_account(&mut ctx, &payer, &holder_a.pubkey(), &env.mint).await;
    let ata_b = create_token_account(&mut ctx, &payer, &holder_b.pubkey(), &env.mint).await;
    token2022_remittance_assignment::simulated_kyc_thaw(&mut ctx, &payer, &env, &ata_a).await;
    token2022_remittance_assignment::simulated_kyc_thaw(&mut ctx, &payer, &env, &ata_b).await;
    mint_tokens(&mut ctx, &payer, &env, &ata_a, 10_000_000).await;

    let mint_data = ctx.banks_client.get_account(env.mint).await.unwrap().unwrap().data;
    let epoch = ctx.banks_client.get_sysvar::<solana_sdk::clock::Clock>().await.unwrap().epoch;
    let amount = 2_000_000u64;
    let fee = epoch_transfer_fee(&mint_data, epoch, amount);
    assert_eq!(fee, 50_000);

    let ix = transfer_with_epoch_fee_ix(
        &ata_a,
        &env.mint,
        &ata_b,
        &holder_a.pubkey(),
        &[],
        amount,
        REMITTANCE_DECIMALS,
        &mint_data,
        epoch,
    );
    send(&mut ctx, vec![ix], &[&payer, &holder_a]).await.unwrap();
    let dest = token2022_remittance_assignment::harness::token_account_amount(&mut ctx, ata_b).await;
    assert_eq!(dest, amount - fee);
}

#[tokio::test]
async fn transfer_rejects_incorrect_fee_expectation() {
    let mut ctx = start_program_test().await;
    let payer = ctx.payer.insecure_clone();
    let env = create_public_remittance_mint(
        &mut ctx,
        &payer,
        PublicRemittanceMintSpec {
            transfer_fee_basis_points: 100,
            maximum_fee: 1_000_000,
        },
    )
    .await;
    let holder = solana_sdk::signature::Keypair::new();
    let dest = solana_sdk::signature::Keypair::new();
    let ata = create_token_account(&mut ctx, &payer, &holder.pubkey(), &env.mint).await;
    let ata_dest = create_token_account(&mut ctx, &payer, &dest.pubkey(), &env.mint).await;
    token2022_remittance_assignment::simulated_kyc_thaw(&mut ctx, &payer, &env, &ata).await;
    token2022_remittance_assignment::simulated_kyc_thaw(&mut ctx, &payer, &env, &ata_dest).await;
    mint_tokens(&mut ctx, &payer, &env, &ata, 1_000_000).await;
    let mint_data = ctx.banks_client.get_account(env.mint).await.unwrap().unwrap().data;
    let epoch = ctx.banks_client.get_sysvar::<solana_sdk::clock::Clock>().await.unwrap().epoch;
    let amount = 500_000u64;
    let wrong_fee = epoch_transfer_fee(&mint_data, epoch, amount) + 1;
    let ix = spl_token_2022::extension::transfer_fee::instruction::transfer_checked_with_fee(
        &spl_token_2022::id(),
        &ata,
        &env.mint,
        &ata_dest,
        &holder.pubkey(),
        &[],
        amount,
        REMITTANCE_DECIMALS,
        wrong_fee,
    )
    .unwrap();
    let err = send(&mut ctx, vec![ix], &[&payer, &holder]).await;
    assert!(err.is_err(), "wrong fee must fail: {:?}", err);
}