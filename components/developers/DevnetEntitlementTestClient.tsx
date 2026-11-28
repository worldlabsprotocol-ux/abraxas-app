"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, Keypair, Message, Transaction } from "@solana/web3.js";
import steps from "../../scripts/operations/devnet-entitlement-wallet-steps.json";
import { injectedPhantom, signPhantomIssuerMessage } from "./phantomIssuerSignature";

const FOUNDER = "3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd";
const PROOF = "CpTXbbnM6crXj1b6WKwuk87bBTYjJWeGRePcJGXS526F";
const CONSUMER = "9gaEjncEjJYq7YVKELNWmegL4dCgtkVqHeaRFCLBr92s";
const GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const RPC = "https://api.devnet.solana.com";
const STORAGE = "abraxas-devnet-wallet-test-v2";
type Evidence = { id: string; signature: string; slot: number; rejected: boolean; wrongHolder?: string };
type Pending = { id: string; signature: string; blockhash: string; lastValidBlockHeight: number; wrongHolder?: string };
type Prepared = { transaction?: string; message?: string; expires?: number; blockhash?: string; lastValidBlockHeight?: number;
  error?: string; spentLamports?: number; maxDebitLamports?: number; remainingAfterMaxLamports?: number;
  effects?: string; expectedFailure?: boolean; stepId?: string; recoverable?: boolean };
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
const decode = (base64: string) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));
const short = (value: string) => `${value.slice(0, 6)}…${value.slice(-6)}`;
const lamports = (value: number) => `${(value / 1_000_000_000).toFixed(9)} Devnet SOL`;

export function DevnetEntitlementTestClient() {
  const wallet = useWallet();
  const [receipt1, setReceipt1] = useState("");
  const [payload1, setPayload1] = useState("");
  const [receipt2, setReceipt2] = useState("");
  const [payload2, setPayload2] = useState("");
  const [expires, setExpires] = useState(0);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [approved, setApproved] = useState(false);
  const [executionEnabled, setExecutionEnabled] = useState(false);
  const [nativeIssuerReady, setNativeIssuerReady] = useState(false);
  const [ceiling, setCeiling] = useState<number | null>(null);
  const [review, setReview] = useState<Prepared | null>(null);
  const [wrongSigner, setWrongSigner] = useState<Keypair | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [verification, setVerification] = useState(false);
  const [connectionRequested, setConnectionRequested] = useState(false);
  const [messageCheck, setMessageCheck] = useState<Uint8Array | null>(null);
  const [messageCheckPassed, setMessageCheckPassed] = useState(false);
  const [priorProgress, setPriorProgress] = useState("");
  const messageWalletReady = wallet.publicKey?.toBase58() === FOUNDER && Boolean(wallet.signMessage);
  const walletReady = wallet.publicKey?.toBase58() === FOUNDER && Boolean(wallet.signTransaction) &&
    (nativeIssuerReady || Boolean(wallet.signMessage));
  const next = steps[evidence.length];
  const connection = new Connection(RPC, "finalized");

  useEffect(() => {
    void fetch("/api/devnet-entitlement-test/prepare", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "preflight", admin: FOUNDER }) })
      .then(async response => { if (!response.ok) throw Error("Devnet preflight failed"); return response.json(); })
      .then(result => { setExecutionEnabled(result.executionEnabled === true);
        setNativeIssuerReady(result.nativeIssuerReady === true);
        setCeiling(result.approvedCeilingLamports ?? null); })
      .catch(() => setNotice("Devnet preflight unavailable. Execution remains disabled."));
  }, []);
  useEffect(() => {
    // These are public test identifiers and transaction IDs, never wallet authorization.
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE) || "null");
      if (saved?.wallet === FOUNDER && /^[0-9a-f]{64}$/.test(saved.receipt1) &&
          /^[0-9a-f]{64}$/.test(saved.receipt2) && /^[0-9a-f]{64}$/.test(saved.payload1) &&
          /^[0-9a-f]{64}$/.test(saved.payload2) && Number.isSafeInteger(saved.expires) &&
          Array.isArray(saved.evidence) && saved.evidence.length <= steps.length) {
        setReceipt1(saved.receipt1); setReceipt2(saved.receipt2);
        setPayload1(saved.payload1); setPayload2(saved.payload2); setExpires(saved.expires);
        setEvidence(saved.evidence); setPending(saved.pending || null);
      }
    } catch { /* Corrupt local progress never authorizes a signature. */ }
  }, []);
  useEffect(() => {
    if (receipt1 && receipt2) sessionStorage.setItem(STORAGE,
      JSON.stringify({ wallet: FOUNDER, receipt1, receipt2, payload1, payload2, expires, evidence, pending }));
  }, [receipt1, receipt2, payload1, payload2, expires, evidence, pending]);
  useEffect(() => { setApproved(false); setReview(null); setWrongSigner(null);
    setMessageCheck(null); setMessageCheckPassed(false); }, [wallet.publicKey?.toBase58()]);
  useEffect(() => {
    if (!connectionRequested || wallet.wallet?.adapter.name !== "Phantom") return;
    setConnectionRequested(false);
    if (wallet.connected || wallet.connecting) return;
    void wallet.connect().catch(error => {
      const message = error instanceof Error ? error.message : "Wallet connection failed";
      setNotice(/reject|declin|cancel/i.test(message)
        ? "Phantom connection was declined. Select Connect Phantom to try again."
        : `Phantom connection failed: ${message}`);
    });
  }, [connectionRequested, wallet.wallet, wallet.connected, wallet.connecting, wallet.connect]);

  function connectPhantom() {
    setNotice("");
    const phantom = wallet.wallets.find(item => item.adapter.name === "Phantom");
    if (!phantom) { setNotice("Phantom is unavailable in this browser."); return; }
    setConnectionRequested(true);
    if (wallet.wallet?.adapter.name !== "Phantom") wallet.select(phantom.adapter.name);
  }
  async function disconnectPhantom() {
    setConnectionRequested(false);
    try {
      await wallet.disconnect();
      setNotice("Wallet disconnected. Connect Phantom to resume with the same approved address.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Wallet disconnect failed");
    }
  }

  function packet() {
    return { admin: FOUNDER, receipt1, payload1, receipt2, payload2, expires, evidence };
  }
  async function prepare(action: string, stepId: string, issuerSignature?: string,
    wrongHolder?: string): Promise<Prepared> {
    const response = await fetch("/api/devnet-entitlement-test/prepare", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...packet(), action, stepId, issuerSignature, wrongHolder }),
    });
    const result = await response.json() as Prepared;
    if (!response.ok || result.error) throw Error(result.error || "Preparation failed");
    return result;
  }
  function start() {
    if (evidence.length || pending) return;
    setReceipt1(hex(crypto.getRandomValues(new Uint8Array(32))));
    setPayload1(hex(crypto.getRandomValues(new Uint8Array(32))));
    setReceipt2(hex(crypto.getRandomValues(new Uint8Array(32))));
    setPayload2(hex(crypto.getRandomValues(new Uint8Array(32))));
    setExpires(Math.floor(Date.now() / 1000) + 25 * 60);
    setReview(null); setApproved(false); setVerification(false);
    setNotice("Two isolated receipts prepared. Review each step before signing.");
  }
  async function recoverExpiredReceipts() {
    if (evidence.length !== 4 || next?.id !== "signed_receipt1" || pending ||
        expires >= Math.floor(Date.now() / 1000) + 60) return;
    setBusy(true);
    try {
      const result = await prepare("recover", next.id);
      if (result.recoverable !== true || result.stepId !== next.id)
        throw Error("The existing four-step journey could not be confirmed");
      setReceipt1(hex(crypto.getRandomValues(new Uint8Array(32))));
      setPayload1(hex(crypto.getRandomValues(new Uint8Array(32))));
      setReceipt2(hex(crypto.getRandomValues(new Uint8Array(32))));
      setPayload2(hex(crypto.getRandomValues(new Uint8Array(32))));
      setExpires(Math.floor(Date.now() / 1000) + 25 * 60);
      setReview(null); setApproved(false); setWrongSigner(null);
      setMessageCheck(null); setMessageCheckPassed(false);
      setNotice("The first four finalized steps were rechecked. Fresh unissued receipt IDs are ready; review Step 5 again. No transaction was submitted.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Receipt recovery could not be verified");
    } finally { setBusy(false); }
  }
  async function restorePriorProgress() {
    if (!walletReady || busy || receipt1 || evidence.length || !priorProgress) return;
    setBusy(true);
    try {
      const saved = JSON.parse(priorProgress);
      if (saved?.wallet !== FOUNDER || !/^[0-9a-f]{64}$/.test(saved.receipt1) ||
          !/^[0-9a-f]{64}$/.test(saved.receipt2) || !/^[0-9a-f]{64}$/.test(saved.payload1) ||
          !/^[0-9a-f]{64}$/.test(saved.payload2) || !Number.isSafeInteger(saved.expires) ||
          saved.expires >= Math.floor(Date.now() / 1000) + 60 ||
          !Array.isArray(saved.evidence) || saved.evidence.length !== 4 || saved.pending)
        throw Error("Prior progress is incomplete or still current");
      const response = await fetch("/api/devnet-entitlement-test/prepare", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin: FOUNDER, receipt1: saved.receipt1, payload1: saved.payload1,
          receipt2: saved.receipt2, payload2: saved.payload2, expires: saved.expires,
          evidence: saved.evidence, action: "recover", stepId: "signed_receipt1" }),
      });
      const result = await response.json() as Prepared;
      if (!response.ok || result.recoverable !== true || result.stepId !== "signed_receipt1")
        throw Error(result.error || "The four finalized steps could not be revalidated");
      setEvidence(saved.evidence.map((item: Evidence, index: number) => ({
        id: steps[index].id, signature: item.signature, slot: item.slot, rejected: false,
      })));
      setReceipt1(hex(crypto.getRandomValues(new Uint8Array(32))));
      setPayload1(hex(crypto.getRandomValues(new Uint8Array(32))));
      setReceipt2(hex(crypto.getRandomValues(new Uint8Array(32))));
      setPayload2(hex(crypto.getRandomValues(new Uint8Array(32))));
      setExpires(Math.floor(Date.now() / 1000) + 25 * 60);
      setPriorProgress(""); setReview(null); setApproved(false);
      setMessageCheck(null); setMessageCheckPassed(false);
      setNotice("Four finalized steps and absent receipt issuance were verified. Fresh unissued receipt IDs are ready. No transaction was submitted.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Prior progress could not be restored"); }
    finally { setBusy(false); }
  }
  async function reviewNext() {
    if (!next || !walletReady || !executionEnabled || pending) return;
    setBusy(true); setNotice("Checking finalized progress and the remaining approved cost allowance…");
    try {
      if (await connection.getGenesisHash() !== GENESIS) throw Error("RPC is not Solana Devnet");
      const signer = next.action === "wrong_holder" ? Keypair.generate() : null;
      const result = await prepare("review", next.id, undefined, signer?.publicKey.toBase58());
      if (result.stepId !== next.id || !Number.isSafeInteger(result.maxDebitLamports))
        throw Error("Incomplete cost review");
      setWrongSigner(signer); setReview(result); setNotice("Review the maximum cost and on-chain effect before signing.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Review failed"); }
    finally { setBusy(false); }
  }
  async function inspectMessageOnly() {
    if (!messageWalletReady) return;
    setBusy(true); setMessageCheck(null); setMessageCheckPassed(false);
    try {
      const result = await prepare("message_only_probe", "message_only_probe");
      if (!result.message || result.stepId !== "message_only_probe" || result.expires !== 0 ||
          !wallet.publicKey || wallet.publicKey.toBase58() !== FOUNDER)
        throw Error("Approved issuer message is unavailable");
      const bytes = decode(result.message);
      if (bytes.length !== 211) throw Error("Unexpected canonical receipt message length");
      setMessageCheck(bytes);
      setNotice("Review the message purpose, byte length and wallet before the separate message-only signature request.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Message inspection failed"); }
    finally { setBusy(false); }
  }
  async function signMessageOnly() {
    if (!messageCheck || !messageWalletReady) return;
    setBusy(true); setMessageCheckPassed(false);
    try {
      if (!wallet.publicKey || wallet.publicKey.toBase58() !== FOUNDER)
        throw Error("Approved issuer wallet disconnected");
      await signPhantomIssuerMessage(messageCheck, wallet.publicKey, injectedPhantom());
      setMessageCheckPassed(true);
      setNotice("Phantom signed the exact canonical-format probe bytes and local Ed25519 verification passed. No transaction was prepared or submitted.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Message signature failed";
      setNotice(/reject|declin|cancel/i.test(message) ? "Phantom message request was declined. No transaction was prepared." : message);
    } finally { setBusy(false); }
  }
  async function recheck(item: Pending) {
    setBusy(true);
    try {
      const observed = await connection.getTransaction(item.signature,
        { commitment: "finalized", maxSupportedTransactionVersion: 0 });
      if (!observed) {
        if (await connection.getBlockHeight("finalized") > item.lastValidBlockHeight) {
          setPending(null); setReview(null);
          setNotice("Transaction expired without a finalized result. Review this step again before signing.");
        } else setNotice("Transaction has not finalized. Recheck before attempting another signature.");
        return;
      }
      const step = steps[evidence.length];
      if (!step || step.id !== item.id) throw Error("Pending step does not match the journey");
      const rejected = Boolean(step.rejected);
      if (Boolean(observed.meta?.err) !== rejected) throw Error("Finalized outcome did not match the required result");
      if (rejected) {
        const message = observed.transaction.message;
        const instructionError = observed.meta?.err && typeof observed.meta.err === "object" &&
          "InstructionError" in observed.meta.err ? observed.meta.err.InstructionError : null;
        const failed = Array.isArray(instructionError) ? instructionError[0] : -1;
        if (!(message instanceof Message)) throw Error("Unexpected versioned negative probe transaction");
        if (!Number.isInteger(failed) || failed < 0 || failed >= message.instructions.length ||
            message.accountKeys[message.instructions[failed].programIdIndex].toBase58() !== CONSUMER)
          throw Error("Negative probe failed outside the entitlement consumer");
      }
      setEvidence(previous => [...previous, { id: item.id, signature: item.signature, slot: observed.slot,
        rejected, ...(item.wrongHolder ? { wrongHolder: item.wrongHolder } : {}) }]);
      setPending(null); setReview(null); setWrongSigner(null); setApproved(false);
      setNotice(`${item.id.replaceAll("_", " ")}: finalized ${rejected ? "consumer rejection" : "success"}. Next step is available.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Finalized result unavailable"); }
    finally { setBusy(false); }
  }
  async function signAndSubmit() {
    if (!next || (next.id === "signed_receipt1" && !nativeIssuerReady) || !review || review.stepId !== next.id || !walletReady || !approved || !executionEnabled ||
        !wallet.signTransaction || pending) return;
    setBusy(true); setNotice("Preparing the reviewed Devnet action…");
    try {
      if (await connection.getGenesisHash() !== GENESIS) throw Error("RPC is not Solana Devnet");
      let issuerSignature: string | undefined;
      if (!nativeIssuerReady && (next.action === "signed_receipt" || next.action === "revoke_receipt")) {
        const message = await prepare("message", next.id);
        if (!message.message) throw Error("Missing authorization message");
        if (!wallet.publicKey) throw Error("Approved issuer wallet disconnected");
        const bytes = decode(message.message);
        const signature = await signPhantomIssuerMessage(bytes, wallet.publicKey, injectedPhantom());
        issuerSignature = btoa(String.fromCharCode(...Array.from(signature)));
      }
      const wrongHolder = wrongSigner?.publicKey.toBase58();
      if (next.action === "wrong_holder" && !wrongSigner) throw Error("Missing unfunded negative-probe signer");
      const prepared = await prepare("transaction", next.id, issuerSignature, wrongHolder);
      if (!prepared.transaction || !prepared.blockhash || !prepared.lastValidBlockHeight ||
          prepared.stepId !== next.id || (prepared.maxDebitLamports ?? Infinity) > (review.maxDebitLamports ?? -1))
        throw Error("Transaction quote changed. Review the step again before signing.");
      const transaction = Transaction.from(decode(prepared.transaction));
      if (transaction.feePayer?.toBase58() !== FOUNDER) throw Error("Unexpected fee payer");
      if (wrongSigner) transaction.partialSign(wrongSigner); // No SOL is ever sent to this temporary signer.
      const signed = await wallet.signTransaction(transaction);
      if (!signed.verifySignatures()) throw Error("Wallet signatures were not valid");
      const signature = await connection.sendRawTransaction(signed.serialize(),
        { skipPreflight: Boolean(next.rejected), maxRetries: 5 });
      const item = { id: next.id, signature, blockhash: prepared.blockhash,
        lastValidBlockHeight: prepared.lastValidBlockHeight, ...(wrongHolder ? { wrongHolder } : {}) };
      setPending(item); setNotice(`Submitted ${short(signature)}. Recheck its finalized result before continuing.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wallet action failed";
      setNotice(/reject|declin|cancel/i.test(message) ? "Wallet request rejected. Review and try this step again." : message);
    } finally { setBusy(false); }
  }
  function publicEvidence() {
    return { schema: "abraxas-devnet-entitlement-wallet-v2", genesis: GENESIS,
      programs: [PROOF, CONSUMER], test_admin: FOUNDER, holder2: FOUNDER,
      receipt1, payload1, receipt2, payload2, expires_at: expires,
      transactions: evidence.map((item, index) => ({ label: steps[index].id, signature: item.signature,
        slot: item.slot, expected_failure: item.rejected,
        ...(item.wrongHolder ? { wrongHolder: item.wrongHolder } : {}) })) };
  }
  async function verifyFinal() {
    setBusy(true); setVerification(false); setNotice("Checking finalized transactions and account state independently…");
    try {
      const response = await fetch("/api/devnet-entitlement-test/verify", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(publicEvidence()) });
      const result = await response.json();
      if (!response.ok || result.verified !== true) throw Error(result.error || "Independent verification failed");
      setVerification(true); setNotice("Independent finalized-RPC verification passed for this test-only journey.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Verification unavailable"); }
    finally { setBusy(false); }
  }
  function downloadEvidence() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(publicEvidence(), null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "abraxas-devnet-entitlement-evidence.json";
    link.click(); URL.revokeObjectURL(url);
  }

  return <main style={{ maxWidth: 760, margin: "3rem auto", padding: "1.5rem", color: "white" }}>
    <h1>Devnet entitlement test</h1>
    <p>Operator test only. The founder wallet pays Devnet fees directly. No SOL is sent to a temporary runner wallet. Each on-chain action requires a separate Phantom confirmation.</p>
    <p>Cluster: Solana Devnet · Wallet: {wallet.publicKey?.toBase58() || "not connected"}</p>
    <p>Execution: {executionEnabled ? "available after separate authorization" : "disabled"} · Approved whole-journey ceiling: {ceiling === null ? "none" : lamports(ceiling)}</p>
    {!wallet.connected && <button onClick={connectPhantom}>Connect Phantom</button>}
    {wallet.connected && <button onClick={() => void disconnectPhantom()}>Disconnect wallet</button>}
    {wallet.connected && !walletReady && <p>Connect the approved founder wallet with message and transaction signing support.</p>}
    <section style={{ border: "1px solid #666", borderRadius: 12, padding: 16 }}>
      <h2>Phantom message-only compatibility check</h2>
      <p>This checks the exact 211-byte receipt format with an expired, non-issuable probe. It cannot authorize a valid receipt or submit a transaction.</p>
      <button disabled={busy || !messageWalletReady} onClick={() => void inspectMessageOnly()}>Inspect message-only compatibility check</button>
      {messageCheck && <div>
        <p>Purpose: test Phantom signing for the canonical receipt format. Message: {messageCheck.length} bytes, displayed by Phantom as hex.</p>
        <p>Signing wallet: {wallet.publicKey?.toBase58()}</p>
        <p>Probe expiration, version and nonce: 0. No transaction preparation, transaction signature, submission or SOL debit follows this check.</p>
        <button disabled={busy || !messageWalletReady} onClick={() => void signMessageOnly()}>Sign receipt message only</button>
      </div>}
      {messageCheckPassed && <p>Exact-byte Ed25519 signature verified locally. No receipt was issued.</p>}
    </section>
    {!receipt1 && <button disabled={!walletReady || !executionEnabled} onClick={start}>Prepare isolated test</button>}
    {!receipt1 && <div>
      <p>Already completed the first four Devnet steps in another Preview? Restore their public test progress. The server rechecks every finalized transaction before resuming.</p>
      <textarea aria-label="Prior public test progress" value={priorProgress}
        onChange={event => setPriorProgress(event.target.value)} rows={3} style={{ width: "100%" }} />
      <button disabled={!walletReady || busy || !priorProgress}
        onClick={() => void restorePriorProgress()}>Recheck and restore four finalized steps</button>
    </div>}
    {receipt1 && <>
      <p>Test receipts: {short(receipt1)} and {short(receipt2)} · Expires: {new Date(expires * 1000).toLocaleString()}</p>
      <p>Finalized steps: {evidence.length} of {steps.length}. Only the next step can be prepared.</p>
      {pending && <div><p>Submitted {short(pending.signature)}. Its finalized outcome must be checked before continuing.</p>
        <button disabled={busy} onClick={() => void recheck(pending)}>Recheck transaction</button></div>}
      {next && !pending && <section style={{ border: "1px solid #666", borderRadius: 12, padding: 16 }}>
        <h2>Next: {next.id.replaceAll("_", " ")}</h2><p>{next.effect}</p>
        {evidence.length === 4 && next.id === "signed_receipt1" && !nativeIssuerReady &&
          <p>Step 5 transaction execution is paused. Use the separate message-only check above.</p>}
        {expires < Math.floor(Date.now()/1000)+60 && <p>Receipts expired. Do not sign or restart from Step 1.</p>}
        {expires < Math.floor(Date.now()/1000)+60 && evidence.length === 4 && next.id === "signed_receipt1" &&
          <button disabled={busy || !walletReady}
            onClick={() => void recoverExpiredReceipts()}>Recheck four steps and prepare fresh receipts</button>}
        <button disabled={!walletReady || !executionEnabled || busy || expires < Math.floor(Date.now()/1000)+60}
          onClick={() => void reviewNext()}>Review next action</button>
        {review?.stepId === next.id && <div>
          <p>Expected effect: {review.effects}</p>
          <p>Maximum next debit, including fee, rent and safety buffer: {lamports(review.maxDebitLamports ?? 0)}</p>
          <p>Already spent in this journey: {lamports(review.spentLamports ?? 0)} · Remaining after maximum debit: {lamports(review.remainingAfterMaxLamports ?? 0)}</p>
          <p>{next.rejected ? "This transaction must be rejected by the entitlement consumer; its fee is still charged." : "This transaction changes test-only Devnet accounts."}</p>
          <label><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} /> I reviewed this action and its maximum Devnet cost.</label>
          <button disabled={!approved || !walletReady || busy || expires < Math.floor(Date.now()/1000)+60 || (next.id === "signed_receipt1" && !nativeIssuerReady)}
            onClick={() => void signAndSubmit()}>Sign this action in Phantom</button>
        </div>}
      </section>}
      {!next && <div><button disabled={busy} onClick={() => void verifyFinal()}>Independently verify finalized evidence</button>
        {verification && <button onClick={downloadEvidence}>Download public evidence</button>}</div>}
    </>}
    {notice && <p role="status">{notice}</p>}
    <h2>Finalized transactions</h2>
    <ol>{evidence.map(item => <li key={item.signature}>{item.id.replaceAll("_", " ")}: <a href={`https://explorer.solana.com/tx/${item.signature}?cluster=devnet`}>{short(item.signature)}</a> · {item.rejected ? "consumer rejected" : "accepted"}</li>)}</ol>
    <p>Local progress is only for navigation. Independent verification checks finalized Devnet transactions and account state.</p>
  </main>;
}
