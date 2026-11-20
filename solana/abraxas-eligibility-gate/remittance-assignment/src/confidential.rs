//! Confidential-transfer helpers for the educational remittance reference (not Abraxas production).

use solana_program_test::ProgramTestContext;
use solana_sdk::{pubkey::Pubkey, signature::{Keypair, Signer}, system_instruction};
use solana_zk_token_sdk::{
    encryption::{
        auth_encryption::{AeCiphertext, AeKey},
        elgamal::{ElGamalKeypair, ElGamalPubkey},
    },
    instruction::{pubkey_validity::PubkeyValidityData, withdraw::WithdrawData},
};
use spl_token_2022::{
    extension::{
        confidential_transfer::{
            account_info::{ApplyPendingBalanceAccountInfo, TransferAccountInfo, WithdrawAccountInfo},
            instruction::{
                apply_pending_balance, approve_account, configure_account, deposit, transfer, withdraw,
            },
            ConfidentialTransferAccount,
        },
        BaseStateWithExtensions, ExtensionType, StateWithExtensions,
    },
    instruction::{initialize_account3, thaw_account},
    proof::ProofLocation,
    state::Account,
};
use std::num::NonZeroI8;

use crate::harness::send;

pub const CONFIDENTIAL_COMPUTE_UNIT_LIMIT: u32 = 1_400_000;

pub struct ConfidentialHolderKeys {
    pub elgamal: ElGamalKeypair,
    pub aes: AeKey,
}

impl ConfidentialHolderKeys {
    pub fn new_rand() -> Self {
        Self {
            elgamal: ElGamalKeypair::new_rand(),
            aes: AeKey::new_rand(),
        }
    }
}

pub fn confidential_token_account_extensions(for_fee_mint: bool) -> Vec<ExtensionType> {
    let mut exts = vec![ExtensionType::ConfidentialTransferAccount];
    if for_fee_mint {
        exts.insert(0, ExtensionType::TransferFeeAmount);
        exts.push(ExtensionType::ConfidentialTransferFeeAmount);
    }
    exts
}

pub async fn create_confidential_ready_token_account(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    owner: &Pubkey,
    mint: &Pubkey,
) -> Pubkey {
    create_confidential_ready_token_account_with_fee_layout(ctx, payer, owner, mint, true).await
}

pub async fn create_confidential_ready_token_account_with_fee_layout(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    owner: &Pubkey,
    mint: &Pubkey,
    for_fee_mint: bool,
) -> Pubkey {
    let account = Keypair::new();
    let space = ExtensionType::try_calculate_account_len::<Account>(&confidential_token_account_extensions(
        for_fee_mint,
    ))
    .expect("confidential token account space");
    let rent = ctx.banks_client.get_rent().await.unwrap().minimum_balance(space);
    let create = system_instruction::create_account(
        &payer.pubkey(),
        &account.pubkey(),
        rent,
        space as u64,
        &spl_token_2022::id(),
    );
    let init = initialize_account3(&spl_token_2022::id(), &account.pubkey(), mint, owner).unwrap();
    send(ctx, vec![create, init], &[payer, &account])
        .await
        .expect("create confidential-ready token account");
    account.pubkey()
}

pub async fn configure_holder_account(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    owner: &Keypair,
    token_account: &Pubkey,
    mint: &Pubkey,
    keys: &ConfidentialHolderKeys,
) {
    let proof_data = PubkeyValidityData::new(&keys.elgamal).expect("pubkey validity proof");
    let decryptable_zero = keys.aes.encrypt(0u64);
    let proof_location = ProofLocation::InstructionOffset(NonZeroI8::new(1).unwrap(), &proof_data);
    let ixs = configure_account(
        &spl_token_2022::id(),
        token_account,
        mint,
        decryptable_zero,
        65_536,
        &owner.pubkey(),
        &[],
        proof_location,
    )
    .expect("configure_account ixs");
    send(ctx, ixs, &[payer, owner]).await.expect("configure confidential account");
}

pub async fn manual_confidential_approval(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    token_account: &Pubkey,
    mint: &Pubkey,
    confidential_mint_authority: &Pubkey,
) {
    let ix = approve_account(
        &spl_token_2022::id(),
        token_account,
        mint,
        confidential_mint_authority,
        &[],
    )
    .expect("approve_account");
    send(ctx, vec![ix], &[payer]).await.expect("manual confidential approval");
}

pub async fn thaw_for_simulated_kyc(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    token_account: &Pubkey,
    mint: &Pubkey,
    freeze_authority: &Pubkey,
) {
    let ix = thaw_account(
        &spl_token_2022::id(),
        token_account,
        mint,
        freeze_authority,
        &[],
    )
    .unwrap();
    send(ctx, vec![ix], &[payer]).await.expect("thaw after simulated kyc");
}

fn unpack_confidential_account(data: &[u8]) -> ConfidentialTransferAccount {
    let acct = StateWithExtensions::<Account>::unpack(data).expect("token account unpack");
    acct.get_extension::<ConfidentialTransferAccount>()
        .expect("confidential extension")
        .clone()
}

pub async fn apply_pending(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    owner: &Keypair,
    token_account: &Pubkey,
    keys: &ConfidentialHolderKeys,
) {
    let data = ctx
        .banks_client
        .get_account(*token_account)
        .await
        .unwrap()
        .unwrap()
        .data;
    let extension = unpack_confidential_account(&data);
    let info = ApplyPendingBalanceAccountInfo::new(&extension);
    let new_decryptable = info
        .new_decryptable_available_balance(&keys.elgamal.secret(), &keys.aes)
        .expect("new decryptable after pending");
    let ix = apply_pending_balance(
        &spl_token_2022::id(),
        token_account,
        info.pending_balance_credit_counter(),
        new_decryptable,
        &owner.pubkey(),
        &[],
    )
    .expect("apply_pending_balance");
    send(ctx, vec![ix], &[payer, owner])
        .await
        .expect("apply pending confidential balance");
}

pub async fn confidential_deposit(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    owner: &Keypair,
    token_account: &Pubkey,
    mint: &Pubkey,
    amount: u64,
    decimals: u8,
) {
    let ix = deposit(
        &spl_token_2022::id(),
        token_account,
        mint,
        amount,
        decimals,
        &owner.pubkey(),
        &[],
    )
    .expect("deposit");
    send(ctx, vec![ix], &[payer, owner])
        .await
        .expect("confidential deposit");
}

pub async fn confidential_transfer(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    owner: &Keypair,
    source: &Pubkey,
    dest: &Pubkey,
    mint: &Pubkey,
    keys: &ConfidentialHolderKeys,
    dest_elgamal_pubkey: &ElGamalPubkey,
    transfer_amount: u64,
) {
    let source_data = ctx.banks_client.get_account(*source).await.unwrap().unwrap().data;
    let extension = unpack_confidential_account(&source_data);
    let transfer_info = TransferAccountInfo::new(&extension);

    let proof_data = transfer_info
        .generate_transfer_proof_data(
            transfer_amount,
            &keys.elgamal,
            &keys.aes,
            dest_elgamal_pubkey,
            None,
        )
        .expect("confidential transfer proof");

    let new_decryptable = transfer_info
        .new_decryptable_available_balance(transfer_amount, &keys.aes)
        .expect("post-transfer decryptable");

    let proof_location = ProofLocation::InstructionOffset(NonZeroI8::new(1).unwrap(), &proof_data);
    let ixs = transfer(
        &spl_token_2022::id(),
        source,
        mint,
        dest,
        new_decryptable,
        &owner.pubkey(),
        &[],
        proof_location,
    )
    .expect("confidential transfer ixs");
    send(ctx, ixs, &[payer, owner])
        .await
        .expect("confidential transfer");
}

pub async fn confidential_withdraw(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    owner: &Keypair,
    token_account: &Pubkey,
    mint: &Pubkey,
    keys: &ConfidentialHolderKeys,
    amount: u64,
    decimals: u8,
) {
    let data = ctx.banks_client.get_account(*token_account).await.unwrap().unwrap().data;
    let extension = unpack_confidential_account(&data);
    let withdraw_info = WithdrawAccountInfo::new(&extension);
    let proof_data: WithdrawData = withdraw_info
        .generate_proof_data(amount, &keys.elgamal, &keys.aes)
        .expect("withdraw proof");
    let new_decryptable: AeCiphertext = withdraw_info
        .new_decryptable_available_balance(amount, &keys.aes)
        .expect("withdraw decryptable");

    let proof_location = ProofLocation::InstructionOffset(NonZeroI8::new(1).unwrap(), &proof_data);
    let ixs = withdraw(
        &spl_token_2022::id(),
        token_account,
        mint,
        amount,
        decimals,
        new_decryptable,
        &owner.pubkey(),
        &[],
        proof_location,
    )
    .expect("withdraw ixs");
    send(ctx, ixs, &[payer, owner]).await.expect("confidential withdraw");
}