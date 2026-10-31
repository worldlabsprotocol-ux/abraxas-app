import "server-only";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  ABRA_SOLANA_MINT, AbraQuoteUnavailable, createAbraPaymentQuote,
  type AbraPaymentQuote, type AbraRateObservation,
} from "./abraServiceCredits";
import { verifyFinalizedAbraPayment } from "./abraSettlement";

type AbraServerConfig = { rpcUrl: string; recipient: PublicKey; networkId: "solana_devnet" | "solana_mainnet";
  rateUrl: URL; rateSource: string; rateApiKey: string };

function readConfig(): AbraServerConfig {
  const rpcUrl = process.env.ABRAXAS_ABRA_RPC_URL?.trim() ?? "";
  const recipientRaw = process.env.ABRAXAS_ABRA_BILLING_RECIPIENT?.trim() ?? "";
  const networkId = process.env.ABRAXAS_ABRA_NETWORK_ID?.trim() ?? "";
  const rateRaw = process.env.ABRAXAS_ABRA_RATE_URL?.trim() ?? "";
  const rateSource = process.env.ABRAXAS_ABRA_RATE_SOURCE?.trim() ?? "";
  const rateApiKey = process.env.ABRAXAS_ABRA_RATE_API_KEY?.trim() ?? "";
  try {
    const rateUrl = new URL(rateRaw);
    const rpc = new URL(rpcUrl);
    if (rateUrl.protocol !== "https:" || rpc.protocol !== "https:"
      || !recipientRaw || !rateSource || !rateApiKey
      || (networkId !== "solana_devnet" && networkId !== "solana_mainnet")) throw new Error();
    return { rpcUrl, recipient: new PublicKey(recipientRaw), networkId, rateUrl, rateSource, rateApiKey };
  } catch { throw new AbraQuoteUnavailable(); }
}

async function readRate(config: AbraServerConfig): Promise<AbraRateObservation> {
  const response = await fetch(config.rateUrl, {
    headers: { Authorization: `Bearer ${config.rateApiKey}` }, cache: "no-store",
    redirect: "error", signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new AbraQuoteUnavailable();
  return await response.json() as AbraRateObservation;
}

export async function prepareAbraPaymentQuote(input: {
  partnerId: string; applicationId: string; creditCents: number;
}): Promise<{ quote: AbraPaymentQuote; networkId: string }> {
  const config = readConfig();
  const connection = new Connection(config.rpcUrl, "finalized");
  const mint = new PublicKey(ABRA_SOLANA_MINT);
  const mintAccount = await connection.getAccountInfo(mint, "finalized");
  if (!mintAccount || ![TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID].some((p) => p.equals(mintAccount.owner)))
    throw new AbraQuoteUnavailable();
  const tokenProgram = mintAccount.owner;
  const mintInfo = await getMint(connection, mint, "finalized", tokenProgram);
  const observation = await readRate(config);
  const quote = createAbraPaymentQuote({
    intentId: crypto.randomUUID(), partnerId: input.partnerId, applicationId: input.applicationId,
    recipient: config.recipient.toBase58(), reference: Keypair.generate().publicKey.toBase58(),
    tokenProgram: tokenProgram.toBase58(), tokenDecimals: mintInfo.decimals,
    creditCents: input.creditCents, observation, expectedSource: config.rateSource, nowMs: Date.now(),
  });
  return { quote, networkId: config.networkId };
}

export async function persistAbraPaymentQuote(quote: AbraPaymentQuote, networkId: string): Promise<void> {
  const sb = requireSupabaseAdmin();
  const { error } = await sb.from("partner_abra_payment_intents").insert({
    intent_id: quote.intent_id, partner_id: quote.partner_id, application_id: quote.application_id,
    network_id: networkId, mint: quote.mint, token_program: quote.token_program,
    recipient: quote.recipient, reference_pubkey: quote.reference,
    token_amount_raw: quote.token_amount_raw, credit_cents: quote.credit_cents,
    rate_source: quote.rate_source, rate_observed_at: quote.rate_observed_at,
    slippage_bps: quote.slippage_bps, expires_at: quote.expires_at,
  });
  if (error) throw new AbraQuoteUnavailable();
}

export async function settleAbraPayment(input: {
  partnerId: string; applicationId: string; intentId: string; signature: string;
}): Promise<"credited" | "already_settled" | "pending"> {
  const config = readConfig();
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.from("partner_abra_payment_intents")
    .select("*").eq("intent_id", input.intentId).eq("partner_id", input.partnerId)
    .eq("application_id", input.applicationId).maybeSingle();
  if (error || !data || data.network_id !== config.networkId
    || data.mint !== ABRA_SOLANA_MINT || data.recipient !== config.recipient.toBase58())
    throw new AbraQuoteUnavailable();
  if (data.status === "settled") {
    if (data.transaction_signature === input.signature) return "already_settled";
    throw new AbraQuoteUnavailable();
  }
  const quote: AbraPaymentQuote = {
    intent_id: String(data.intent_id), partner_id: String(data.partner_id),
    application_id: String(data.application_id), mint: ABRA_SOLANA_MINT,
    token_program: String(data.token_program), recipient: String(data.recipient),
    reference: String(data.reference_pubkey), credit_cents: Number(data.credit_cents),
    token_amount_raw: String(data.token_amount_raw), rate_source: String(data.rate_source),
    rate_observed_at: String(data.rate_observed_at), slippage_bps: Number(data.slippage_bps),
    expires_at: String(data.expires_at),
  };
  const proof = await verifyFinalizedAbraPayment({ rpcUrl: config.rpcUrl, signature: input.signature, quote });
  if (!proof) return "pending";
  const settled = await sb.rpc("settle_partner_abra_payment_intent", {
    p_intent_id: input.intentId, p_partner_id: input.partnerId,
    p_application_id: input.applicationId, p_transaction_signature: input.signature,
    p_transaction_block_time: proof.blockTime,
  });
  if (settled.error || (settled.data !== "credited" && settled.data !== "already_settled"))
    throw new AbraQuoteUnavailable();
  return settled.data;
}

