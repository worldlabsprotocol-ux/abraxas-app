// FILE: lib/solana/txBuilder.ts
// Transaction builder — produces serialized transactions the UI can simulate
// and the user's wallet can sign.
//
// Architecture:
//   Client calls /api/vault/[action] → server builds tx → returns base64
//   Client simulates via wallet.signTransaction (dry run) → user confirms → send
//
// NO ANCHOR: Uses raw @solana/web3.js. When Anchor program deployed,
// replace the memo instructions with program CPI calls. The interface stays identical.

import {
  Connection, PublicKey, Transaction, TransactionInstruction,
  SystemProgram, LAMPORTS_PER_SOL,
} from "@solana/web3.js";

// Memo program — used to log vault actions on-chain until program is deployed
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function memoInstruction(text: string, signer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    keys:       [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId:  MEMO_PROGRAM_ID,
    data:       Buffer.from(text, "utf-8"),
  });
}

// ─── Vault creation tx ────────────────────────────────────────────────────────
// Creates a memo on-chain: "ABRAXAS:VAULT:CREATE:{pda}:{agentType}:{version}"
// When program deployed: replace with initialize_vault CPI.

export async function buildCreateVaultTx(params: {
  connection:  Connection;
  owner:       PublicKey;
  pda:         string;
  agentType:   number;
  mintAddress: string;
}): Promise<Transaction> {
  const { connection, owner, pda, agentType, mintAddress } = params;

  const memo = JSON.stringify({
    protocol: "ABRAXAS",
    action:   "CREATE_VAULT",
    pda,
    agentType,
    mintAddress,
    riskScore:   50,
    circuitState:1,   // MEDIUM
    version:     1,
    ts:          Date.now(),
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction();
  tx.recentBlockhash        = blockhash;
  tx.lastValidBlockHeight   = lastValidBlockHeight;
  tx.feePayer               = owner;
  tx.add(memoInstruction(memo, owner));

  return tx;
}

// ─── Vault state update tx ────────────────────────────────────────────────────
// Logs risk event + Sophia response on-chain.
// When program deployed: replace with update_vault_state CPI.

export async function buildUpdateVaultTx(params: {
  connection:   Connection;
  owner:        PublicKey;
  pda:          string;
  riskScorePrev:number;
  riskScoreNew: number;
  circuitState: number;
  agentAction:  string;
  strategy:     string;
}): Promise<Transaction> {
  const { connection, owner, pda, riskScorePrev, riskScoreNew, circuitState, agentAction, strategy } = params;

  const memo = JSON.stringify({
    protocol:     "ABRAXAS",
    action:       "UPDATE_VAULT",
    pda,
    riskScorePrev,
    riskScoreNew:  Math.max(0, Math.min(100, riskScoreNew)), // checked
    circuitState,
    agentAction,
    strategy,
    ts:            Date.now(),
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction();
  tx.recentBlockhash      = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer             = owner;
  tx.add(memoInstruction(memo, owner));

  return tx;
}

// ─── Simulate ─────────────────────────────────────────────────────────────────
// Returns simulation result — units consumed, logs, any error.
// Call this BEFORE asking user to sign.

export interface SimulationResult {
  ok:           boolean;
  unitsConsumed:number | null;
  logs:         string[];
  error:        string | null;
  feeEstimate:  number;   // lamports
}

export async function simulateTx(connection: Connection, tx: Transaction): Promise<SimulationResult> {
  try {
    const sim = await connection.simulateTransaction(tx, undefined, true);
    const ok  = sim.value.err === null;
    return {
      ok,
      unitsConsumed: sim.value.unitsConsumed ?? null,
      logs:          sim.value.logs ?? [],
      error:         ok ? null : JSON.stringify(sim.value.err),
      feeEstimate:   5000, // conservative memo tx fee (5000 lamports ~0.000005 SOL)
    };
  } catch (e) {
    return { ok: false, unitsConsumed: null, logs: [], error: String(e), feeEstimate: 5000 };
  }
}

// ─── Serialise for client ─────────────────────────────────────────────────────
// Server builds tx, serialises, client deserialises + partial-signs + sends.

export function serialiseTx(tx: Transaction): string {
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString("base64");
}

export function deserialiseTx(b64: string): Transaction {
  return Transaction.from(Buffer.from(b64, "base64"));
}