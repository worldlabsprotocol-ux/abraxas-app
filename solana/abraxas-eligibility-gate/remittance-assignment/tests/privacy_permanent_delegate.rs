use solana_sdk::signature::Signer;
use spl_token_2022::instruction::transfer_checked;
use token2022_remittance_assignment::{
    create_privacy_remittance_mint, create_token_account, inspect_combined_privacy_mint_extensions,
    inspect_privacy_mint,
    PublicRemittanceMintSpec, REMITTANCE_DECIMALS, start_program_test,
    harness::{send, token_account_amount},
};

#[tokio::test]
async fn privacy_mint_includes_confidential_transfer_and_permanent_delegate() {
    let mut ctx = start_program_test().await;
    let payer = ctx.payer.insecure_clone();
    let delegate = solana_sdk::signature::Keypair::new();
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
    let data = ctx.banks_client.get_account(env.mint).await.unwrap().unwrap().data;
    inspect_combined_privacy_mint_extensions(&data).unwrap();
    let (ct, perm) = inspect_privacy_mint(&data).unwrap();
    assert!(!bool::from(ct.auto_approve_new_accounts)); // manual approval required
    assert_eq!(perm, delegate.pubkey());
}

#[tokio::test]
async fn permanent_delegate_moves_public_balance_but_not_confidential_state() {
    let mut ctx = start_program_test().await;
    let payer = ctx.payer.insecure_clone();
    let delegate = solana_sdk::signature::Keypair::new();
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
    let holder = solana_sdk::signature::Keypair::new();
    let sink = solana_sdk::signature::Keypair::new();
    let ata = create_token_account(&mut ctx, &payer, &holder.pubkey(), &env.mint).await;
    let sink_ata = create_token_account(&mut ctx, &payer, &sink.pubkey(), &env.mint).await;
    for acct in [&ata, &sink_ata] {
        let thaw = spl_token_2022::instruction::thaw_account(
            &spl_token_2022::id(),
            acct,
            &env.mint,
            &env.freeze_authority,
            &[],
        )
        .unwrap();
        send(&mut ctx, vec![thaw], &[&payer]).await.unwrap();
    }
    let mint_ix = spl_token_2022::instruction::mint_to(
        &spl_token_2022::id(),
        &env.mint,
        &ata,
        &env.mint_authority,
        &[],
        500_000,
    )
    .unwrap();
    send(&mut ctx, vec![mint_ix], &[&payer]).await.unwrap();

    let seize_ix = transfer_checked(
        &spl_token_2022::id(),
        &ata,
        &env.mint,
        &sink_ata,
        &delegate.pubkey(),
        &[],
        100_000,
        REMITTANCE_DECIMALS,
    )
    .unwrap();
    send(&mut ctx, vec![seize_ix], &[&payer, &delegate]).await.unwrap();
    assert_eq!(token_account_amount(&mut ctx, ata).await, 400_000);
    assert_eq!(token_account_amount(&mut ctx, sink_ata).await, 100_000);

    // Account has no configured confidential transfer state in this test — seizure of encrypted
    // balances is out of scope for PermanentDelegate alone (see README finding).
}