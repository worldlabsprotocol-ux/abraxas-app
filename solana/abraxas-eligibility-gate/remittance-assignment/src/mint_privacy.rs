//! Second remittance mint: public extensions plus PermanentDelegate and confidential-transfer configuration.

use solana_program_test::ProgramTestContext;
use solana_sdk::{pubkey::Pubkey, signature::{Keypair, Signer}, system_instruction};
use spl_token_2022::{
    extension::{
        confidential_transfer::{
            instruction::initialize_mint as initialize_confidential_transfer_mint,
            ConfidentialTransferMint,
        },
        confidential_transfer_fee::instruction::initialize_confidential_transfer_fee_config,
        BaseStateWithExtensions, ExtensionType, StateWithExtensions,
    },
    instruction::{initialize_mint2, initialize_permanent_delegate},
    state::Mint,
};

use crate::mint_public::{public_mint_extensions, PublicRemittanceMintSpec, REMITTANCE_DECIMALS};
use crate::harness::send;

pub struct PrivacyRemittanceEnvironment {
    pub mint: Pubkey,
    pub mint_keypair: Keypair,
    pub permanent_delegate: Pubkey,
    pub mint_authority: Pubkey,
    pub freeze_authority: Pubkey,
}

pub fn privacy_mint_extensions() -> Vec<ExtensionType> {
    let mut ext = public_mint_extensions();
    ext.push(ExtensionType::PermanentDelegate);
    ext.push(ExtensionType::ConfidentialTransferMint);
    ext.push(ExtensionType::ConfidentialTransferFeeConfig);
    ext
}

pub fn privacy_mint_space() -> usize {
    ExtensionType::try_calculate_account_len::<Mint>(&privacy_mint_extensions()).expect("privacy mint space")
}

pub async fn create_privacy_remittance_mint(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    permanent_delegate: &Pubkey,
    spec: PublicRemittanceMintSpec,
) -> PrivacyRemittanceEnvironment {
    let _spec = spec;
    let mint_keypair = Keypair::new();
    let mint = mint_keypair.pubkey();
    let mint_authority = payer.pubkey();
    let freeze_authority = payer.pubkey();
    let space = privacy_mint_space();
    let rent = ctx.banks_client.get_rent().await.unwrap().minimum_balance(space);

    use spl_token_2022::extension::{
        default_account_state::instruction::initialize_default_account_state,
        metadata_pointer::instruction::initialize as initialize_metadata_pointer,
        transfer_fee::instruction::initialize_transfer_fee_config,
    };
    use spl_token_2022::instruction::initialize_mint_close_authority;
    use spl_token_2022::state::AccountState;

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
        Some(&mint_authority),
        Some(&mint_authority),
        _spec.transfer_fee_basis_points,
        _spec.maximum_fee,
    )
    .unwrap();
    let init_meta = initialize_metadata_pointer(&spl_token_2022::id(), &mint, Some(mint_authority), Some(mint)).unwrap();
    let init_frozen = initialize_default_account_state(&spl_token_2022::id(), &mint, &AccountState::Frozen).unwrap();
    let init_close = initialize_mint_close_authority(&spl_token_2022::id(), &mint, Some(&mint_authority)).unwrap();
    let init_perm = initialize_permanent_delegate(&spl_token_2022::id(), &mint, permanent_delegate).unwrap();
    let elgamal_audit = spl_token_2022::solana_zk_token_sdk::zk_token_elgamal::pod::ElGamalPubkey::default();
    let init_ct_fee = initialize_confidential_transfer_fee_config(
        &spl_token_2022::id(),
        &mint,
        Some(mint_authority),
        elgamal_audit,
    )
    .unwrap();
    let init_ct = initialize_confidential_transfer_mint(
        &spl_token_2022::id(),
        &mint,
        None,
        false,
        None,
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
        vec![create, init_fee, init_meta, init_frozen, init_close, init_perm, init_ct_fee, init_ct, init_mint],
        &[payer, &mint_keypair],
    )
    .await
    .expect("privacy remittance mint");

    PrivacyRemittanceEnvironment {
        mint,
        mint_keypair,
        permanent_delegate: *permanent_delegate,
        mint_authority,
        freeze_authority,
    }
}

pub fn inspect_privacy_mint(data: &[u8]) -> Result<(ConfidentialTransferMint, Pubkey), String> {
    let mint = StateWithExtensions::<Mint>::unpack(data).map_err(|e| e.to_string())?;
    let ct = mint
        .get_extension::<ConfidentialTransferMint>()
        .map_err(|e| e.to_string())?
        .clone();
    let delegate = mint
        .get_extension::<spl_token_2022::extension::permanent_delegate::PermanentDelegate>()
        .map_err(|e| e.to_string())?;
    let del = Option::<Pubkey>::from(delegate.delegate).unwrap_or_default();
    Ok((ct, del))
}

/// Re-export for tests comparing issuance models.
pub type PublicEnv = crate::mint_public::PublicRemittanceEnvironment;
pub use crate::mint_public::create_public_remittance_mint;