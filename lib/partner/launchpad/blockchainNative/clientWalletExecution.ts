import { Connection, Transaction } from "@solana/web3.js";

async function waitForFinalizedSignature(connection: Connection, signature: string, timeoutMs = 120_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = await connection.getSignatureStatuses([signature]);
    const value = status?.value?.[0];
    if (value?.err) throw new Error("chain_transaction_failed");
    if (value?.confirmationStatus === "finalized") return;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error("chain_transaction_finality_timeout");
}

export async function signAndSendPreparedSolanaTransaction(input: {
  rpcUrl: string;
  transactionBase64: string;
  recentBlockhash: string;
  lastValidBlockHeight: number;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
}): Promise<string> {
  const connection = new Connection(input.rpcUrl, { commitment: "finalized" });
  const tx = Transaction.from(Buffer.from(input.transactionBase64, "base64"));
  tx.recentBlockhash = input.recentBlockhash;
  tx.lastValidBlockHeight = input.lastValidBlockHeight;
  const signed = await input.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "finalized",
  });
  await connection.confirmTransaction(
    { signature, blockhash: input.recentBlockhash, lastValidBlockHeight: input.lastValidBlockHeight },
    "finalized",
  );
  await waitForFinalizedSignature(connection, signature);
  return signature;
}