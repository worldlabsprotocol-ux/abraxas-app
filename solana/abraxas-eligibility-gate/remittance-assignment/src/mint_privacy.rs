//! Second remittance mint: public extensions plus PermanentDelegate and confidential-transfer configuration.

use solana_program_test::ProgramTestContext;
use solana_sdk::{pubkey::Pubkey, signature::{Keypair, Signer}, system_instruction};
use solana_zk_token_sdk::encryption::elgamal::ElGamalKeypair;
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
    pub confidential_transfer_authority: Pubkey,
    pub withheld_fee_elgamal: solana_zk_token_sdk::zk_token_elgamal::pod::ElGamalPubkey,
}

pub fn privacy_mint_extensions(include_public_transfer_fee: bool) -> Vec<ExtensionType> {
    let mut ext = if include_public_transfer_fee {
        public_mint_extensions()
    } else {
        vec![
            ExtensionType::MetadataPointer,
            ExtensionType::DefaultAccountState,
            ExtensionType::MintCloseAuthority,
        ]
    };
    ext.push(ExtensionType::PermanentDelegate);
    ext.push(ExtensionType::ConfidentialTransferMint);
    if include_public_transfer_fee {
        ext.push(ExtensionType::ConfidentialTransferFeeConfig);
    }
    ext
}

pub fn privacy_mint_space(include_public_transfer_fee: bool) -> usize {
    ExtensionType::try_calculate_account_len::<Mint>(&privacy_mint_extensions(include_public_transfer_fee))
        .expect("privacy mint space")
}

pub async fn create_privacy_remittance_mint(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    permanent_delegate: &Pubkey,
    spec: PublicRemittanceMintSpec,
) -> PrivacyRemittanceEnvironment {
    create_privacy_remittance_mint_inner(ctx, payer, permanent_delegate, spec, true).await
}

/// Privacy mint **without** public `TransferFeeConfig` — used to exercise the confidential ZK transfer
/// path in ProgramTest. Combining public transfer fees with confidential transfer presently requires
/// split proof context state accounts when `enable_zk_transfer_with_fee` is active on cluster.
pub async fn create_privacy_remittance_mint_confidential_lifecycle(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    permanent_delegate: &Pubkey,
) -> PrivacyRemittanceEnvironment {
    create_privacy_remittance_mint_inner(
        ctx,
        payer,
        permanent_delegate,
        PublicRemittanceMintSpec {
            transfer_fee_basis_points: 0,
            maximum_fee: 0,
        },
        false,
    )
    .await
}

async fn create_privacy_remittance_mint_inner(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    permanent_delegate: &Pubkey,
    spec: PublicRemittanceMintSpec,
    include_public_transfer_fee: bool,
) -> PrivacyRemittanceEnvironment {
    let mint_keypair = Keypair::new();
    let mint = mint_keypair.pubkey();
    let mint_authority = payer.pubkey();
    let freeze_authority = payer.pubkey();
    let space = privacy_mint_space(include_public_transfer_fee);
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
    let mut setup = vec![create];
    if include_public_transfer_fee {
        let init_fee = initialize_transfer_fee_config(
            &spl_token_2022::id(),
            &mint,
            Some(&mint_authority),
            Some(&mint_authority),
            spec.transfer_fee_basis_points,
            spec.maximum_fee,
        )
        .unwrap();
        setup.push(init_fee);
    }
    let init_meta = initialize_metadata_pointer(&spl_token_2022::id(), &mint, Some(mint_authority), Some(mint)).unwrap();
    let init_frozen = initialize_default_account_state(&spl_token_2022::id(), &mint, &AccountState::Frozen).unwrap();
    let init_close = initialize_mint_close_authority(&spl_token_2022::id(), &mint, Some(&mint_authority)).unwrap();
    let init_perm = initialize_permanent_delegate(&spl_token_2022::id(), &mint, permanent_delegate).unwrap();
    let withheld_elgamal_pod = if include_public_transfer_fee {
        let withheld_fee_keys = ElGamalKeypair::new_rand();
        spl_token_2022::solana_zk_token_sdk::zk_token_elgamal::pod::ElGamalPubkey(
            withheld_fee_keys.pubkey().to_bytes(),
        )
    } else {
        spl_token_2022::solana_zk_token_sdk::zk_token_elgamal::pod::ElGamalPubkey::default()
    };
    let mut init_ct_fee = None;
    if include_public_transfer_fee {
        init_ct_fee = Some(
            initialize_confidential_transfer_fee_config(
                &spl_token_2022::id(),
                &mint,
                Some(mint_authority),
                withheld_elgamal_pod,
            )
            .unwrap(),
        );
    }
    let init_ct = initialize_confidential_transfer_mint(
        &spl_token_2022::id(),
        &mint,
        Some(mint_authority),
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

    setup.extend([init_meta, init_frozen, init_close, init_perm]);
    if let Some(ix) = init_ct_fee {
        setup.push(ix);
    }
    setup.extend([init_ct, init_mint]);
    send(ctx, setup, &[payer, &mint_keypair])
    .await
    .expect("privacy remittance mint");

    PrivacyRemittanceEnvironment {
        mint,
        mint_keypair,
        permanent_delegate: *permanent_delegate,
        mint_authority,
        freeze_authority,
        confidential_transfer_authority: mint_authority,
        withheld_fee_elgamal: withheld_elgamal_pod,
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