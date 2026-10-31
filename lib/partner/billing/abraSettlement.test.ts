import { describe, expect, it } from "vitest";
import { Keypair, PublicKey, type ParsedTransactionWithMeta, type SignatureStatus } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { ABRA_SOLANA_MINT, type AbraPaymentQuote } from "./abraServiceCredits";
import { transactionPaysAbraQuote } from "./abraSettlement";

const mint = new PublicKey(ABRA_SOLANA_MINT);
const recipient = Keypair.generate().publicKey;
const reference = Keypair.generate().publicKey;
const ata = getAssociatedTokenAddressSync(mint, recipient);
const memoProgram = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const quote: AbraPaymentQuote = {
  intent_id: "690d0c89-7b98-4946-8ad2-7469f5ca89d9",
  partner_id: "partner", application_id: "app", mint: ABRA_SOLANA_MINT,
  token_program: TOKEN_PROGRAM_ID.toBase58(), recipient: recipient.toBase58(),
  reference: reference.toBase58(), credit_cents: 1000, token_amount_raw: "10050000",
  rate_source: "approved-feed", rate_observed_at: new Date(1_700_000_000_000).toISOString(),
  slippage_bps: 50, expires_at: new Date(1_700_000_120_000).toISOString(),
};
const finalized = { confirmationStatus: "finalized", err: null } as SignatureStatus;
function fixture(): ParsedTransactionWithMeta {
  return {
    blockTime: 1_700_000_030,
    meta: { err: null, preTokenBalances: [{ accountIndex: 1, mint: ABRA_SOLANA_MINT,
      uiTokenAmount: { amount: "0" } }], postTokenBalances: [{ accountIndex: 1,
      mint: ABRA_SOLANA_MINT, uiTokenAmount: { amount: "10050000" } }] },
    transaction: { message: {
      accountKeys: [{ pubkey: reference }, { pubkey: ata }],
      instructions: [
        { programId: memoProgram, parsed: quote.intent_id },
        { programId: TOKEN_PROGRAM_ID, parsed: { type: "transferChecked", info: {
          mint: ABRA_SOLANA_MINT, destination: ata.toBase58(),
          tokenAmount: { amount: "10050000" },
        } } },
      ],
    } },
  } as unknown as ParsedTransactionWithMeta;
}
function pays(tx: ParsedTransactionWithMeta | null, status: SignatureStatus | null = finalized,
  q: AbraPaymentQuote = quote) { return transactionPaysAbraQuote({ quote: q, transaction: tx, status }); }

describe("finalized ABRA settlement proof", () => {
  it("accepts a finalized, exact-mint transfer with intent memo and recipient delta", () => {
    expect(pays(fixture())).toBe(true);
  });
  it("rejects unfinalized, failed, expired and underpaid transactions", () => {
    expect(pays(fixture(), { ...finalized, confirmationStatus: "confirmed" })).toBe(false);
    expect(pays(fixture(), { ...finalized, err: { InstructionError: [0, "InvalidArgument"] } })).toBe(false);
    expect(pays({ ...fixture(), blockTime: 1_700_000_121 })).toBe(false);
    expect(pays(fixture(), finalized, { ...quote, token_amount_raw: "10050001" })).toBe(false);
  });
  it("rejects wrong mint, token program, destination, reference and intent memo", () => {
    expect(pays(fixture(), finalized, { ...quote, mint: "wrong" as typeof ABRA_SOLANA_MINT })).toBe(false);
    expect(pays(fixture(), finalized, { ...quote, token_program: TOKEN_2022_PROGRAM_ID.toBase58() })).toBe(false);
    expect(pays(fixture(), finalized, { ...quote, recipient: Keypair.generate().publicKey.toBase58() })).toBe(false);
    expect(pays(fixture(), finalized, { ...quote, reference: Keypair.generate().publicKey.toBase58() })).toBe(false);
    expect(pays(fixture(), finalized, { ...quote, intent_id: "other-intent" })).toBe(false);
  });
});

