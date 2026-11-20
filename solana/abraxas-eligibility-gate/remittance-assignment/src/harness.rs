use solana_program_test::{processor, BanksClientError, ProgramTest, ProgramTestContext};
use solana_sdk::{
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use spl_token_2022::solana_program::program_pack::Pack;

pub async fn start_program_test() -> ProgramTestContext {
    let mut test = ProgramTest::default();
    test.add_program(
        "spl_token_2022",
        spl_token_2022::id(),
        processor!(spl_token_2022::processor::Processor::process),
    );
    test.start_with_context().await
}

pub async fn send(
    ctx: &mut ProgramTestContext,
    ixs: Vec<Instruction>,
    signers: &[&Keypair],
) -> Result<(), BanksClientError> {
    let blockhash = ctx.banks_client.get_latest_blockhash().await?;
    let tx = Transaction::new_signed_with_payer(&ixs, Some(&ctx.payer.pubkey()), signers, blockhash);
    ctx.banks_client.process_transaction(tx).await
}

pub async fn send_all(
    ctx: &mut ProgramTestContext,
    ixs: Vec<Instruction>,
    signers: &[&Keypair],
) -> Result<(), BanksClientError> {
    let blockhash = ctx.banks_client.get_latest_blockhash().await?;
    let tx = Transaction::new_signed_with_payer(&ixs, Some(&ctx.payer.pubkey()), signers, blockhash);
    ctx.banks_client.process_transaction(tx).await
}

pub async fn account_data(ctx: &mut ProgramTestContext, pk: Pubkey) -> Option<Vec<u8>> {
    ctx.banks_client.get_account(pk).await.ok().flatten().map(|a| a.data)
}

pub async fn token_account_amount(ctx: &mut ProgramTestContext, pk: Pubkey) -> u64 {
    let data = account_data(ctx, pk).await.expect("token account");
    let state = spl_token_2022::state::Account::unpack(&data[..spl_token_2022::state::Account::LEN]).unwrap();
    state.amount
}