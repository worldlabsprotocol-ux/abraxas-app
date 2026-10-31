import {
  Connection, PublicKey, type ParsedTransactionWithMeta, type SignatureStatus,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync, getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { ABRA_SOLANA_MINT, type AbraPaymentQuote } from "./abraServiceCredits";

export const ALLOWED_ABRA_TOKEN_PROGRAMS = [TOKEN_PROGRAM_ID.toBase58(), TOKEN_2022_PROGRAM_ID.toBase58()];

export function transactionPaysAbraQuote(input: {
  quote: AbraPaymentQuote;
  transaction: ParsedTransactionWithMeta | null;
  status: SignatureStatus | null;
}): boolean {
  const { quote, transaction: tx, status } = input;
  if (!tx || !status || status.confirmationStatus !== "finalized" || status.err !== null
    || tx.meta?.err !== null || tx.blockTime == null
    || !ALLOWED_ABRA_TOKEN_PROGRAMS.includes(quote.token_program)
    || quote.mint !== ABRA_SOLANA_MINT) return false;
  const txMs = tx.blockTime * 1000;
  if (txMs < Date.parse(quote.rate_observed_at) || txMs > Date.parse(quote.expires_at)) return false;
  const keys = tx.transaction.message.accountKeys.map((key) => key.pubkey.toBase58());
  if (!keys.includes(quote.reference)) return false;
  const recipientAta = getAssociatedTokenAddressSync(
    new PublicKey(quote.mint), new PublicKey(quote.recipient), false,
    new PublicKey(quote.token_program),
  ).toBase58();
  const accountIndex = keys.indexOf(recipientAta);
  if (accountIndex < 0) return false;
  const memoProgram = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
  const hasIntentMemo = tx.transaction.message.instructions.some((instruction) =>
    "programId" in instruction && instruction.programId.toBase58() === memoProgram
      && "parsed" in instruction && instruction.parsed === quote.intent_id,
  );
  if (!hasIntentMemo) return false;
  const checkedTransfer = tx.transaction.message.instructions.some((instruction) => {
    if (!("programId" in instruction) || instruction.programId.toBase58() !== quote.token_program
      || !("parsed" in instruction) || typeof instruction.parsed !== "object"
      || !instruction.parsed) return false;
    const parsed = instruction.parsed as { type?: string; info?: {
      mint?: string; destination?: string; tokenAmount?: { amount?: string };
    } };
    return parsed.type === "transferChecked" && parsed.info?.mint === quote.mint
      && parsed.info.destination === recipientAta
      && /^\d+$/.test(parsed.info.tokenAmount?.amount ?? "")
      && BigInt(parsed.info.tokenAmount!.amount!) >= BigInt(quote.token_amount_raw);
  });
  if (!checkedTransfer) return false;
  const before = tx.meta?.preTokenBalances?.find((b) => b.accountIndex === accountIndex && b.mint === quote.mint);
  const after = tx.meta?.postTokenBalances?.find((b) => b.accountIndex === accountIndex && b.mint === quote.mint);
  const beforeRaw = BigInt(before?.uiTokenAmount.amount ?? "0");
  const afterRaw = BigInt(after?.uiTokenAmount.amount ?? "0");
  return afterRaw - beforeRaw >= BigInt(quote.token_amount_raw);
}

export async function verifyFinalizedAbraPayment(input: {
  rpcUrl: string; signature: string; quote: AbraPaymentQuote;
}): Promise<{ signature: string; blockTime: string } | null> {
  const connection = new Connection(input.rpcUrl, "finalized");
  const mint = new PublicKey(ABRA_SOLANA_MINT);
  const program = new PublicKey(input.quote.token_program);
  if (!ALLOWED_ABRA_TOKEN_PROGRAMS.includes(program.toBase58())) return null;
  const mintAccount = await connection.getAccountInfo(mint, "finalized");
  if (!mintAccount || !mintAccount.owner.equals(program)) return null;
  await getMint(connection, mint, "finalized", program); // rejects a mismatched mint/program
  const [statusResult, transaction] = await Promise.all([
    connection.getSignatureStatuses([input.signature], { searchTransactionHistory: true }),
    connection.getParsedTransaction(input.signature, {
      commitment: "finalized", maxSupportedTransactionVersion: 0,
    }),
  ]);
  if (!transactionPaysAbraQuote({ quote: input.quote, transaction,
    status: statusResult.value[0] })) return null;
  return { signature: input.signature, blockTime: new Date(transaction!.blockTime! * 1000).toISOString() };
}

