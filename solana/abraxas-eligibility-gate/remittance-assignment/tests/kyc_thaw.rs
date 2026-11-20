use solana_sdk::signature::Signer;
use spl_token_2022::extension::transfer_fee::instruction::transfer_checked_with_fee;
use token2022_remittance_assignment::{
    create_public_remittance_mint, create_token_account, epoch_transfer_fee, mint_tokens,
    simulated_kyc_thaw, PublicRemittanceMintSpec, REMITTANCE_DECIMALS, start_program_test,
    harness::send,
};

#[tokio::test]
async fn frozen_account_blocks_transfer_until_simulated_kyc_thaw() {
    let mut ctx = start_program_test().await;
    let payer = ctx.payer.insecure_clone();
    let env = create_public_remittance_mint(
        &mut ctx,
        &payer,
        PublicRemittanceMintSpec {
            transfer_fee_basis_points: 0,
            maximum_fee: 0,
        },
    )
    .await;
    let holder = solana_sdk::signature::Keypair::new();
    let dest = solana_sdk::signature::Keypair::new();
    let ata = create_token_account(&mut ctx, &payer, &holder.pubkey(), &env.mint).await;
    let other = create_token_account(&mut ctx, &payer, &dest.pubkey(), &env.mint).await;
    simulated_kyc_thaw(&mut ctx, &payer, &env, &ata).await;
    mint_tokens(&mut ctx, &payer, &env, &ata, 100_000).await;
    let refreeze = spl_token_2022::instruction::freeze_account(
        &spl_token_2022::id(),
        &ata,
        &env.mint,
        &env.freeze_authority,
        &[],
    )
    .unwrap();
    send(&mut ctx, vec![refreeze], &[&payer]).await.unwrap();

    let mint_data = ctx.banks_client.get_account(env.mint).await.unwrap().unwrap().data;
    let epoch = ctx.banks_client.get_sysvar::<solana_sdk::clock::Clock>().await.unwrap().epoch;
    let fee = epoch_transfer_fee(&mint_data, epoch, 10_000);
    let blocked = transfer_checked_with_fee(
        &spl_token_2022::id(),
        &ata,
        &env.mint,
        &other,
        &holder.pubkey(),
        &[],
        10_000,
        REMITTANCE_DECIMALS,
        fee,
    )
    .unwrap();
    assert!(send(&mut ctx, vec![blocked], &[&payer, &holder]).await.is_err());

    let impostor = solana_sdk::signature::Keypair::new();
    let thaw_fail = spl_token_2022::instruction::thaw_account(
        &spl_token_2022::id(),
        &ata,
        &env.mint,
        &impostor.pubkey(),
        &[],
    )
    .unwrap();
    assert!(send(&mut ctx, vec![thaw_fail], &[&payer, &impostor]).await.is_err());

    simulated_kyc_thaw(&mut ctx, &payer, &env, &ata).await;
    simulated_kyc_thaw(&mut ctx, &payer, &env, &other).await;
    let allowed = transfer_checked_with_fee(
        &spl_token_2022::id(),
        &ata,
        &env.mint,
        &other,
        &holder.pubkey(),
        &[],
        10_000,
        REMITTANCE_DECIMALS,
        fee,
    )
    .unwrap();
    send(&mut ctx, vec![allowed], &[&payer, &holder]).await.unwrap();
}