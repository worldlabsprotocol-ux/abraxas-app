"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Connection, Transaction } from "@solana/web3.js";

const FOUNDER = "3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd";
const RPC = "https://api.devnet.solana.com";
const GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const ACTIONS = [
  "initialize_registry", "bind_holder", "initialize_mint", "initialize_relying_party",
  "signed_receipt", "mint_entitlement", "consume_entitlement", "repeat_consume",
  "revoke_receipt", "revoked_consume",
] as const;
type Action = typeof ACTIONS[number];
type Evidence = { action: Action; signature: string; slot: number; rejected: boolean };
type Prepared = { transaction?: string; message?: string; blockhash?: string; lastValidBlockHeight?: number; error?: string };
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
const decode = (base64: string) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

export function DevnetEntitlementTestClient() {
  const wallet = useWallet();
  const modal = useWalletModal();
  const [receipt, setReceipt] = useState("");
  const [payload, setPayload] = useState("");
  const [expires, setExpires] = useState(0);
  const [approved, setApproved] = useState(false);
  const [executionEnabled, setExecutionEnabled] = useState(false);
  const [ceiling, setCeiling] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const walletReady = wallet.publicKey?.toBase58() === FOUNDER && Boolean(wallet.signMessage && wallet.signTransaction);
  const connection = new Connection(RPC, "finalized");

  useEffect(() => {
    void fetch("/api/devnet-entitlement-test/prepare", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "preflight", admin: FOUNDER }) })
      .then(async response => { if (!response.ok) throw Error("Devnet preflight failed"); return response.json(); })
      .then(result => { setExecutionEnabled(result.executionEnabled === true); setCeiling(result.quote?.ceiling_lamports ?? null); })
      .catch(() => setNotice("Devnet preflight unavailable. No transactions can be prepared."));
  }, []);
  useEffect(() => {
    // Public test identifiers only. A refresh never restores wallet authorization.
    try {
      const saved = JSON.parse(sessionStorage.getItem("abraxas-devnet-wallet-test-v1") || "null");
      if (saved && saved.wallet === FOUNDER && /^[0-9a-f]{64}$/.test(saved.receipt) &&
          /^[0-9a-f]{64}$/.test(saved.payload) && Number.isSafeInteger(saved.expires)) {
        setReceipt(saved.receipt); setPayload(saved.payload); setExpires(saved.expires);
        setEvidence(Array.isArray(saved.evidence) ? saved.evidence : []);
      }
    } catch { /* A corrupt local draft grants no authority. */ }
  }, []);
  useEffect(() => {
    if (receipt && payload) sessionStorage.setItem("abraxas-devnet-wallet-test-v1",
      JSON.stringify({ wallet: FOUNDER, receipt, payload, expires, evidence }));
  }, [receipt, payload, expires, evidence]);

  async function prepare(action: string, issuerSignature?: string): Promise<Prepared> {
    const response = await fetch("/api/devnet-entitlement-test/prepare", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, admin: FOUNDER, receipt, payload, expires, issuerSignature }),
    });
    const result = await response.json() as Prepared;
    if (!response.ok || result.error) throw Error(result.error || "Transaction preparation failed");
    return result;
  }
  function start() {
    const nextReceipt = hex(crypto.getRandomValues(new Uint8Array(32)));
    const nextPayload = hex(crypto.getRandomValues(new Uint8Array(32)));
    setReceipt(nextReceipt); setPayload(nextPayload);
    setExpires(Math.floor(Date.now() / 1000) + 25 * 60);
    setEvidence([]); setApproved(false); setNotice("New isolated test prepared. Review and authorize each wallet action separately.");
  }
  async function run(action: Action) {
    if (!walletReady || !approved || !executionEnabled || !wallet.signTransaction || !wallet.signMessage) return;
    setBusy(true); setNotice(`Preparing ${action} on Solana Devnet…`);
    try {
      if (await connection.getGenesisHash() !== GENESIS) throw Error("RPC is not Solana Devnet");
      let issuerSignature: string | undefined;
      if (action === "signed_receipt" || action === "revoke_receipt") {
        const messageAction = action === "signed_receipt" ? "message_receipt" : "message_revoke";
        const message = await prepare(messageAction);
        if (!message.message) throw Error("Missing authorization message");
        issuerSignature = btoa(String.fromCharCode(...Array.from(await wallet.signMessage(decode(message.message)))));
      }
      const prepared = await prepare(action, issuerSignature);
      if (!prepared.transaction || !prepared.blockhash || !prepared.lastValidBlockHeight)
        throw Error("Missing prepared transaction");
      const transaction = Transaction.from(decode(prepared.transaction));
      if (transaction.feePayer?.toBase58() !== FOUNDER) throw Error("Unexpected transaction payer");
      const signed = await wallet.signTransaction(transaction);
      if (!signed.verifySignatures()) throw Error("Wallet signature was not valid");
      const rejected = action === "repeat_consume" || action === "revoked_consume";
      const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: rejected, maxRetries: 5 });
      const confirmation = await connection.confirmTransaction({ signature,
        blockhash: prepared.blockhash, lastValidBlockHeight: prepared.lastValidBlockHeight }, "finalized");
      const observed = await connection.getTransaction(signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
      if (!observed || Boolean(observed.meta?.err) !== rejected || Boolean(confirmation.value.err) !== rejected)
        throw Error(`Finalized outcome did not match expected ${rejected ? "rejection" : "success"}: ${signature}`);
      setEvidence(previous => [...previous, { action, signature, slot: observed.slot, rejected }]);
      setNotice(`${action}: finalized ${rejected ? "rejection" : "success"}. Verify the account state independently before treating the lifecycle as complete.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Wallet action failed");
    } finally { setBusy(false); }
  }

  return <main style={{ maxWidth: 760, margin: "3rem auto", padding: "1.5rem", color: "white" }}>
    <h1>Devnet entitlement test</h1>
    <p>Operator test only. The connected founder wallet pays Devnet fees directly. No SOL is sent to a temporary runner wallet. Each action requires a separate Phantom confirmation.</p>
    <p>Cluster: Solana Devnet · Wallet: {wallet.publicKey?.toBase58() || "not connected"}</p>
    <p>Read-only funding ceiling: {ceiling === null ? "not verified" : `${ceiling.toLocaleString()} lamports`} · Execution: {executionEnabled ? "enabled for authorized operator test" : "disabled"}</p>
    {!wallet.connected && <button onClick={() => modal.setVisible(true)}>Connect wallet</button>}
    {wallet.connected && !walletReady && <p>Connect the approved founder wallet with message and transaction signing support.</p>}
    <button disabled={!walletReady || busy} onClick={start}>Create isolated test</button>
    {receipt && <>
      <p>Receipt: {receipt} · Expires: {new Date(expires * 1000).toLocaleString()}</p>
      <label><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} /> I authorize individual test-only Devnet transactions from this wallet.</label>
      <ol>{ACTIONS.map(action => <li key={action} style={{ margin: "0.75rem 0" }}>
        <button disabled={!walletReady || !approved || !executionEnabled || busy || expires < Math.floor(Date.now()/1000)+60}
          onClick={() => void run(action)}>{action.replaceAll("_", " ")}</button>
      </li>)}</ol>
    </>}
    {notice && <p role="status">{notice}</p>}
    <h2>Finalized transactions</h2>
    <ul>{evidence.map(item => <li key={item.signature}>{item.action}: <a href={`https://explorer.solana.com/tx/${item.signature}?cluster=devnet`}>{item.signature}</a> · {item.rejected ? "rejected" : "accepted"}</li>)}</ul>
    <p>Local transaction history is for navigation only. It does not establish independent verification or current authorization.</p>
  </main>;
}

