//! ZK proof context state accounts for confidential transfers (educational reference).

use solana_program_test::ProgramTestContext;
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_instruction,
};
use solana_zk_token_sdk::{
    instruction::transfer::TransferWithFeeData,
    zk_token_proof_instruction::{verify_transfer_with_fee, ContextStateInfo},
    zk_token_proof_program,
    zk_token_proof_state::ProofContextState,
};
use solana_zk_token_sdk::instruction::transfer::TransferWithFeeProofContext;
use std::mem::size_of;

use crate::harness::send;

pub struct TransferWithFeeProofContextAccount {
    pub keypair: Keypair,
    pub pubkey: Pubkey,
}

pub async fn create_and_verify_transfer_with_fee_context(
    ctx: &mut ProgramTestContext,
    payer: &Keypair,
    context_authority: &Pubkey,
    proof_data: &TransferWithFeeData,
) -> TransferWithFeeProofContextAccount {
    let keypair = Keypair::new();
    let space = size_of::<ProofContextState<TransferWithFeeProofContext>>();
    let rent = ctx.banks_client.get_rent().await.unwrap().minimum_balance(space);
    let create = system_instruction::create_account(
        &payer.pubkey(),
        &keypair.pubkey(),
        rent,
        space as u64,
        &zk_token_proof_program::id(),
    );
    let verify_ix = verify_transfer_with_fee(
        Some(ContextStateInfo {
            context_state_account: &keypair.pubkey(),
            context_state_authority: context_authority,
        }),
        proof_data,
    );
    send(ctx, vec![create, verify_ix], &[payer, &keypair])
        .await
        .expect("verify transfer-with-fee into context state");
    TransferWithFeeProofContextAccount {
        pubkey: keypair.pubkey(),
        keypair,
    }
}