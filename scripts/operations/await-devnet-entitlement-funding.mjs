// Wait for an authorized, finalized Devnet transfer from the proposed upgrade wallet.
// The transfer proves control of that wallet and funds a one-run deployment payer.
import { Connection, PublicKey } from "@solana/web3.js";

const [payerText, authorityText, quoteText, ceilingText, genesisExpected] = process.argv.slice(2);
const payer = new PublicKey(payerText);
const authority = new PublicKey(authorityText);
const quote = Number(quoteText);
const ceiling = Number(ceilingText);
if (!Number.isSafeInteger(quote) || !Number.isSafeInteger(ceiling) || quote <= 0 || ceiling < quote) {
  throw new Error("Invalid approved Devnet funding ceiling");
}
const connection = new Connection(process.env.ABRAXAS_DEVNET_RPC_URL || "https://api.devnet.solana.com", "finalized");
if (await connection.getGenesisHash() !== genesisExpected) throw new Error("RPC genesis mismatch");
const start = Date.now();
const deadline = start + 45 * 60_000;
console.log(`Fund Devnet payer ${payer.toBase58()} from upgrade wallet ${authority.toBase58()}. `
  + `Send between ${quote} and ${ceiling} lamports in one authorized transfer. Waiting up to 45 minutes.`);
while (Date.now() < deadline) {
  const signatures = await connection.getSignaturesForAddress(payer, { limit: 20 }, "finalized");
  for (const { signature, err } of signatures) {
    if (err) continue;
    const tx = await connection.getParsedTransaction(signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
    if (!tx?.transaction.message.accountKeys.some((key) => key.pubkey.equals(authority) && key.signer)) continue;
    const transfer = tx.transaction.message.instructions.find((instruction) =>
      "parsed" in instruction && instruction.program === "system" && instruction.parsed?.type === "transfer"
      && instruction.parsed.info?.source === authority.toBase58()
      && instruction.parsed.info?.destination === payer.toBase58()
      && Number(instruction.parsed.info?.lamports) >= quote
      && Number(instruction.parsed.info?.lamports) <= ceiling);
    if (!transfer) continue;
    const balance = await connection.getBalance(payer, "finalized");
    if (balance < quote || balance > ceiling) continue;
    console.log(`Authorized funding confirmed: ${signature}`);
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 15_000));
}
throw new Error("No finalized funding transfer from the proposed upgrade wallet before timeout");

