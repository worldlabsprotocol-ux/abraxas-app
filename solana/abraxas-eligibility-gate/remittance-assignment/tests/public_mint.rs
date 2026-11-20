use solana_sdk::signature::Signer;
use spl_token_2022::{
    extension::{BaseStateWithExtensions, StateWithExtensions},
    state::{AccountState, Mint},
};
use token2022_remittance_assignment::{
    create_public_remittance_mint, inspect_public_mint, public_mint_space, PublicRemittanceMintSpec,
    start_program_test,
};

#[tokio::test]
async fn public_remittance_mint_extensions_initialized() {
    let mut ctx = start_program_test().await;
    let payer = ctx.payer.insecure_clone();
    let spec = PublicRemittanceMintSpec {
        transfer_fee_basis_points: 100,
        maximum_fee: 5_000_000,
    };
    let env = create_public_remittance_mint(&mut ctx, &payer, spec).await;
    let data = ctx
        .banks_client
        .get_account(env.mint)
        .await
        .unwrap()
        .expect("mint account")
        .data;
    assert!(data.len() >= public_mint_space());
    let (fee, default_state) = inspect_public_mint(&data).unwrap();
    assert_eq!(u16::from(fee.newer_transfer_fee.transfer_fee_basis_points), 100);
    assert_eq!(u64::from(fee.newer_transfer_fee.maximum_fee), 5_000_000);
    assert_eq!(default_state.state, AccountState::Frozen as u8);
    let mint = StateWithExtensions::<Mint>::unpack(&data).unwrap();
    assert!(mint.get_extension::<spl_token_2022::extension::metadata_pointer::MetadataPointer>().is_ok());
    assert!(mint.get_extension::<spl_token_2022::extension::mint_close_authority::MintCloseAuthority>().is_ok());
    assert_eq!(env.mint, env.mint_keypair.pubkey());
}