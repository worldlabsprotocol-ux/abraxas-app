use solana_program_test::ProgramTestContext;
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_instruction,
    program_pack::Pack,
};
use spl_token_2022::{
    extension::{
        default_account_state::{
            instruction::initialize_default_account_state,
            DefaultAccountState,
        },
        metadata_pointer::instruction::initialize as initialize_metadata_pointer,
        transfer_fee::{
            instruction::{initialize_transfer_fee_config, transfer_checked_with_fee},
            TransferFeeConfig,
        },
        BaseStateWithExtensions, ExtensionType, StateWithExtensions,
    },
    instruction::{
        initialize_account3, initialize_mint2, initialize_mint_close_authority, mint_to, thaw_account,
    },
    state::{AccountState, Mint},
};

use crate::harness::send;

pub const REMITTANCE_DECIMALS: u8 = 6;

pub struct PublicRemittanceMintSpec {
    pub transfer_fee_basis_points: u16,
    pub maximum_fee: u64,
}

pub struct PublicRemittanceEnvironment {
    pub mint: Pubkey,
    pub mint_keypair: Keypair,
    pub mint_authority: Pubkey,
    pub freeze_authority: Pubkey,
    pub fee_authority: Pubkey,
    pub close_authority: Pubkey,
    pub spec: PublicRemittanceMintSpec,
}

pub fn public_mint_extensions() -> Vec<ExtensionType> {
    vec![
        ExtensionType::TransferFeeConfig,
        ExtensionType::MetadataPointer,
        ExtensionType::DefaultAccountState,
        ExtensionType::MintCloseAuthority,
    ]
}

pub fn public_mint_space() -> usize {
    ExtensionType::try_calculate_account_len::<Mint>(&public_mint_extensions()).expect("mint space")
}

pub async fn create_public_remittance_mint(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    spec: PublicRemittanceMintSpec,
) -> PublicRemittanceEnvironment {
    let mint_keypair = Keypair::new();
    let mint = mint_keypair.pubkey();
    let mint_authority = payer.pubkey();
    let freeze_authority = payer.pubkey();
    let fee_authority = payer.pubkey();
    let close_authority = payer.pubkey();
    let space = public_mint_space();
    let rent = ctx.banks_client.get_rent().await.unwrap().minimum_balance(space);

    let create = system_instruction::create_account(
        &payer.pubkey(),
        &mint,
        rent,
        space as u64,
        &spl_token_2022::id(),
    );
    let init_fee = initialize_transfer_fee_config(
        &spl_token_2022::id(),
        &mint,
        Some(&fee_authority),
        Some(&fee_authority),
        spec.transfer_fee_basis_points,
        spec.maximum_fee,
    )
    .unwrap();
    let init_meta_ptr = initialize_metadata_pointer(
        &spl_token_2022::id(),
        &mint,
        Some(mint_authority),
        Some(mint),
    )
    .unwrap();
    let init_default_frozen = initialize_default_account_state(
        &spl_token_2022::id(),
        &mint,
        &AccountState::Frozen,
    )
    .unwrap();
    let init_close = initialize_mint_close_authority(
        &spl_token_2022::id(),
        &mint,
        Some(&close_authority),
    )
    .unwrap();
    let init_mint = initialize_mint2(
        &spl_token_2022::id(),
        &mint,
        &mint_authority,
        Some(&freeze_authority),
        REMITTANCE_DECIMALS,
    )
    .unwrap();

    send(
        ctx,
        vec![create, init_fee, init_meta_ptr, init_default_frozen, init_close, init_mint],
        &[payer, &mint_keypair],
    )
    .await
    .expect("initialize public remittance mint");

    PublicRemittanceEnvironment {
        mint,
        mint_keypair,
        mint_authority,
        freeze_authority,
        fee_authority,
        close_authority,
        spec,
    }
}

pub fn inspect_public_mint(data: &[u8]) -> Result<(TransferFeeConfig, DefaultAccountState), String> {
    let mint = StateWithExtensions::<Mint>::unpack(data).map_err(|e| e.to_string())?;
    let fee = mint
        .get_extension::<TransferFeeConfig>()
        .map_err(|e| e.to_string())?
        .clone();
    let default_state = mint
        .get_extension::<DefaultAccountState>()
        .map_err(|e| e.to_string())?
        .clone();
    Ok((fee, default_state))
}

pub async fn create_token_account(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    owner: &Pubkey,
    mint: &Pubkey,
) -> Pubkey {
    let account = Keypair::new();
    let space = ExtensionType::try_calculate_account_len::<spl_token_2022::state::Account>(&[ExtensionType::TransferFeeAmount])
        .unwrap_or(spl_token_2022::state::Account::LEN);
    let rent = ctx.banks_client.get_rent().await.unwrap().minimum_balance(space);
    let create = system_instruction::create_account(
        &payer.pubkey(),
        &account.pubkey(),
        rent,
        space as u64,
        &spl_token_2022::id(),
    );
    let init = initialize_account3(&spl_token_2022::id(), &account.pubkey(), mint, owner).unwrap();
    send(ctx, vec![create, init], &[payer, &account]).await.expect("create token account");
    account.pubkey()
}

pub async fn mint_tokens(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    env: &PublicRemittanceEnvironment,
    dest: &Pubkey,
    amount: u64,
) {
    let ix = mint_to(
        &spl_token_2022::id(),
        &env.mint,
        dest,
        &env.mint_authority,
        &[],
        amount,
    )
    .unwrap();
    send(ctx, vec![ix], &[payer]).await.expect("mint_to");
}

pub fn epoch_transfer_fee(mint_data: &[u8], epoch: u64, amount: u64) -> u64 {
    let mint = StateWithExtensions::<Mint>::unpack(mint_data).expect("mint unpack");
    let cfg = mint.get_extension::<TransferFeeConfig>().expect("fee config");
    cfg.calculate_epoch_fee(epoch, amount).unwrap()
}

pub fn transfer_with_epoch_fee_ix(
    source: &Pubkey,
    mint: &Pubkey,
    dest: &Pubkey,
    authority: &Pubkey,
    signers: &[&Pubkey],
    amount: u64,
    decimals: u8,
    mint_data: &[u8],
    epoch: u64,
) -> solana_sdk::instruction::Instruction {
    let fee = epoch_transfer_fee(mint_data, epoch, amount);
    transfer_checked_with_fee(
        &spl_token_2022::id(),
        source,
        mint,
        dest,
        authority,
        signers,
        amount,
        decimals,
        fee,
    )
    .unwrap()
}

pub async fn simulated_kyc_thaw(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    env: &PublicRemittanceEnvironment,
    account: &Pubkey,
) {
    let ix = thaw_account(
        &spl_token_2022::id(),
        account,
        &env.mint,
        &env.freeze_authority,
        &[],
    )
    .unwrap();
    send(ctx, vec![ix], &[payer]).await.expect("simulated kyc thaw");
}