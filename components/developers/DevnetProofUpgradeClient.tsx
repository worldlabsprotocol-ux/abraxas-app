"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { BEFORE_LENGTH, BEFORE_SHA256, CANDIDATE_LENGTH, CANDIDATE_SHA256, closeBuffer,
  createBuffer, DEVNET_GENESIS, enforceBudget, FOUNDER, hash, inspectBuffer, inspectCandidate,
  inspectProgram, MAX_LAMPORTS, PROOF_PROGRAM, upgrade, writeBuffer, WRITE_CHUNK } from "@/lib/solana/devnetProofUpgrade";

const RPC = new Connection("https://api.devnet.solana.com", "finalized");
const STORAGE = "abraxas-devnet-proof-upgrade-v1";
const PENDING_BUFFER = "abraxas-devnet-proof-upgrade-pending-buffer-v1";
const PRESERVED = [
  "2FbFNQxiszgaVVyh22HPHSuAHRDPkwEr3rWzvLA6AMS9",
  "42XYEo4FSi99KE2QoCvdbB3GV7MshzjWgohowEM5m3aZ",
  "HkxkdRXD7vZewsyJgEMDnpheQJ2TEpE2WUBUyu396ReB",
  "5AsV7zezn7AQa2nFMFZ8jan5MUCKY7Ck24ZMQUjk9NyG",
];
type Progress = { buffer: string; initialBalance: number; signatures: string[]; creationSignature: string };
type Review = { action: "create" | "write" | "upgrade" | "close"; fee: number; debit: number; offset?: number };

export function DevnetProofUpgradeClient() {
  const wallet = useWallet();
  const [enabled, setEnabled] = useState(false);
  const [approval, setApproval] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Uint8Array | null>(null);
  const [candidateReady, setCandidateReady] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [recoveryBuffer, setRecoveryBuffer] = useState("");
  const [bufferKeypair, setBufferKeypair] = useState<Keypair | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [status, setStatus] = useState("Select the reviewed ELF for a read-only preflight.");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [connectRequested, setConnectRequested] = useState(false);
  const walletReady = wallet.publicKey?.equals(FOUNDER) && Boolean(wallet.signTransaction);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE);
    if (saved) try { const p = JSON.parse(saved) as Progress;
      if (new PublicKey(p.buffer) && Number.isSafeInteger(p.initialBalance) &&
          Array.isArray(p.signatures) && typeof p.creationSignature === "string") setProgress(p);
    } catch { sessionStorage.removeItem(STORAGE); }
    const pending = sessionStorage.getItem(PENDING_BUFFER);
    if (pending) try { setRecoveryBuffer(JSON.parse(pending).address); } catch { setStatus("Pending buffer record is malformed; stop and inspect RPC state"); }
    void fetch("/api/devnet-proof-upgrade/authorization", { cache: "no-store" })
      .then(r => r.json()).then(x => { setEnabled(x.enabled === true && x.maxLamports === MAX_LAMPORTS);
        setApproval(x.approvalReference || null); }).catch(() => setEnabled(false));
  }, []);
  useEffect(() => { setReview(null); }, [wallet.publicKey?.toBase58()]);
  useEffect(() => {
    if (!connectRequested || wallet.wallet?.adapter.name !== "Phantom" || wallet.connected || wallet.connecting) return;
    void wallet.connect().catch(error => setStatus(`Phantom connection failed: ${String(error)}`))
      .finally(() => setConnectRequested(false));
  }, [connectRequested, wallet.wallet, wallet.connected, wallet.connecting, wallet.connect]);

  function connectPhantom() {
    setConnectRequested(true);
    const phantom = wallet.wallets.find(x => x.adapter.name === "Phantom");
    if (!phantom) { setStatus("Phantom extension was not detected"); setConnectRequested(false); return; }
    if (wallet.wallet?.adapter.name !== "Phantom") wallet.select(phantom.adapter.name);
  }

  const transactionPayer = (message: { accountKeys: PublicKey[] } | { staticAccountKeys: PublicKey[] }) =>
    "staticAccountKeys" in message ? message.staticAccountKeys[0] : message.accountKeys[0];

  async function selectElf(file?: File) {
    setReview(null); setCandidateReady(false); setCandidate(null); if (!file) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const before = await inspectProgram(RPC, BEFORE_SHA256, BEFORE_LENGTH);
      await inspectCandidate(bytes, before.allocation);
      await preservedAccounts();
      const rent = await RPC.getMinimumBalanceForRentExemption(37 + bytes.length, "finalized");
      const writes = Math.ceil(bytes.length / WRITE_CHUNK);
      const feeReserve = (writes + 3) * 5_000;
      const balance = await RPC.getBalance(FOUNDER, "finalized");
      if (rent + feeReserve > MAX_LAMPORTS) throw Error("Live Devnet rent and base-fee quote exceeds ceiling");
      setCandidate(bytes); setCandidateReady(true);
      setStatus(`Read-only preflight passed: ${bytes.length} bytes, SHA-256 ${await hash(bytes)}; allocation ${before.allocation} bytes. Finalized Devnet buffer rent ${rent} lamports; ${writes} bounded writes; base-fee estimate ${feeReserve} lamports; founder balance ${balance} lamports. Actual fees are requoted before each signature. No transaction prepared.`);
    } catch (error) { setStatus(String(error)); }
  }

  async function currentBuffer() {
    if (!progress || !candidate) throw Error("Candidate and finalized buffer evidence required");
    const buffer = new PublicKey(progress.buffer);
    const creation = await RPC.getTransaction(progress.creationSignature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
    if (!creation || creation.meta?.err || !creation.meta ||
        !transactionPayer(creation.transaction.message).equals(FOUNDER)) throw Error("Buffer creation transaction is not finalized for founder payer");
    const initialBalance = creation.meta.preBalances[0];
    if (initialBalance !== progress.initialBalance) throw Error("Spending baseline mismatch");
    const state = await inspectBuffer(RPC, buffer, candidate);
    return { buffer, state, initialBalance };
  }

  async function recoverFinalizedBuffer() {
    if (!candidate || !candidateReady || progress) return;
    setBusy(true);
    try {
      const buffer = new PublicKey(recoveryBuffer);
      await inspectBuffer(RPC, buffer, candidate);
      const signatures = await RPC.getSignaturesForAddress(buffer, { limit: 1000 }, "finalized");
      const finalized = signatures.filter(x => !x.err && x.confirmationStatus === "finalized").reverse();
      if (!finalized.length || signatures.length === 1000) throw Error("Complete finalized buffer history unavailable");
      const creationSignature = finalized[0].signature;
      const tx = await RPC.getTransaction(creationSignature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
      if (!tx?.meta || tx.meta.err || !transactionPayer(tx.transaction.message).equals(FOUNDER))
        throw Error("Buffer creation payer or finalized status mismatch");
      const next = { buffer: buffer.toBase58(), creationSignature, initialBalance: tx.meta.preBalances[0],
        signatures: finalized.map(x => x.signature) };
      sessionStorage.setItem(STORAGE, JSON.stringify(next)); sessionStorage.removeItem(PENDING_BUFFER);
      setProgress(next); setRecoveryBuffer(""); setStatus(`Recovered ${finalized.length} finalized buffer actions through Devnet RPC.`);
    } catch (error) { setStatus(`Recovery stopped: ${String(error)}`); }
    finally { setBusy(false); }
  }

  async function discardExpiredUnsubmittedBuffer() {
    setBusy(true);
    try {
      const pending = JSON.parse(sessionStorage.getItem(PENDING_BUFFER) || "null") as
        { address: string; lastValidBlockHeight: number } | null;
      if (!pending || pending.address !== recoveryBuffer || !Number.isSafeInteger(pending.lastValidBlockHeight))
        throw Error("Pending buffer record is incomplete");
      if (await RPC.getBlockHeight("finalized") <= pending.lastValidBlockHeight)
        throw Error("Creation blockhash is still live; wait before discarding");
      const address = new PublicKey(pending.address);
      if (await RPC.getAccountInfo(address, "finalized") ||
          (await RPC.getSignaturesForAddress(address, { limit: 1 }, "finalized")).length)
        throw Error("Buffer may have finalized; recover it instead");
      sessionStorage.removeItem(PENDING_BUFFER); setRecoveryBuffer(""); setBufferKeypair(null);
      setStatus("Expired unsubmitted buffer address cleared; no account or transaction exists at finalized commitment.");
    } catch (error) { setStatus(`Discard stopped: ${String(error)}`); }
    finally { setBusy(false); }
  }

  async function preservedAccounts() {
    const infos = await RPC.getMultipleAccountsInfo(PRESERVED.map(x => new PublicKey(x)), "finalized");
    if (infos.some(x => !x || x.data.length === 0)) throw Error("One of the four finalized lifecycle accounts is missing");
    return Promise.all(infos.map(async x => ({ owner: x!.owner.toBase58(), digest: await hash(x!.data) })));
  }

  async function prepare(action: Review["action"]) {
    if (!candidate || !candidateReady || !walletReady || !enabled || busy) return;
    setBusy(true); setReview(null);
    try {
      if (await RPC.getGenesisHash() !== DEVNET_GENESIS) throw Error("Wrong Devnet genesis");
      await inspectCandidate(candidate, (await inspectProgram(RPC, BEFORE_SHA256, BEFORE_LENGTH)).allocation);
      let instructions: TransactionInstruction[]; let debit = 0; let offset: number | undefined;
      if (action === "create") {
        if (progress) throw Error("Existing buffer must be recovered or closed first");
        const signer = bufferKeypair || Keypair.generate(); setBufferKeypair(signer);
        debit = await RPC.getMinimumBalanceForRentExemption(37 + CANDIDATE_LENGTH, "finalized");
        instructions = createBuffer(signer.publicKey, debit);
      } else {
        const { buffer, state } = await currentBuffer();
        if (action === "write") {
          if (state.complete) throw Error("All buffer bytes are already finalized");
          offset = state.nextOffset;
          instructions = [writeBuffer(buffer, offset, candidate.subarray(offset, offset + WRITE_CHUNK))];
        } else if (action === "upgrade") {
          if (!state.complete) throw Error("Exact candidate ELF has not been uploaded");
          await preservedAccounts(); instructions = [upgrade(buffer)];
        } else instructions = [closeBuffer(buffer)];
      }
      const { blockhash } = await RPC.getLatestBlockhash("finalized");
      const tx = new Transaction({ feePayer: FOUNDER, recentBlockhash: blockhash }).add(...instructions);
      const fee = (await RPC.getFeeForMessage(tx.compileMessage(), "finalized")).value;
      if (fee === null) throw Error("Cannot quote finalized transaction fee");
      const balance = await RPC.getBalance(FOUNDER, "finalized");
      const spent = progress ? Math.max(0, progress.initialBalance - balance) : 0;
      if (progress && balance > progress.initialBalance) throw Error("Founder balance increased; reconcile funding history before continuing");
      enforceBudget(spent, debit, fee);
      if (balance < debit + fee + 50_000_000) throw Error("Insufficient Devnet SOL including 0.05 SOL safety reserve");
      setReview({ action, fee, debit, offset });
      setStatus(`Review ${action}: ${debit} lamports refundable buffer rent, ${fee} lamports estimated fee, ${spent} lamports already debited. This requires a separate Phantom transaction confirmation.`);
    } catch (error) { setStatus(String(error)); }
    finally { setBusy(false); }
  }

  async function signReviewed() {
    if (!review || !enabled || !walletReady || !wallet.signTransaction || !candidate || busy) return;
    setBusy(true); const approved = review; setReview(null);
    try {
      // Reconstruct every instruction from finalized state; never sign a cached blockhash.
      const before = await inspectProgram(RPC, BEFORE_SHA256, BEFORE_LENGTH);
      await inspectCandidate(candidate, before.allocation);
      const beforeAccounts = approved.action === "upgrade" ? await preservedAccounts() : null;
      let instructions: TransactionInstruction[];
      let signer: Keypair | null = null;
      if (approved.action === "create") {
        if (progress || !bufferKeypair) throw Error("Stale buffer initialization review");
        signer = bufferKeypair;
        const rent = await RPC.getMinimumBalanceForRentExemption(37 + CANDIDATE_LENGTH, "finalized");
        if (rent !== approved.debit) throw Error("Buffer rent changed; review again");
        instructions = createBuffer(bufferKeypair.publicKey, rent);
      } else {
        const { buffer, state } = await currentBuffer();
        if (approved.action === "write") {
          if (state.complete || state.nextOffset !== approved.offset) throw Error("Buffer progressed; review again");
          instructions = [writeBuffer(buffer, state.nextOffset, candidate.subarray(state.nextOffset, state.nextOffset + WRITE_CHUNK))];
        } else if (approved.action === "upgrade") {
          if (!state.complete) throw Error("Buffer hash is not the approved candidate");
          instructions = [upgrade(buffer)];
        } else instructions = [closeBuffer(buffer)];
      }
      const { blockhash, lastValidBlockHeight } = await RPC.getLatestBlockhash("finalized");
      const tx = new Transaction({ feePayer: FOUNDER, recentBlockhash: blockhash }).add(...instructions);
      const fee = (await RPC.getFeeForMessage(tx.compileMessage(), "finalized")).value;
      if (fee === null || fee > approved.fee) throw Error("Fee quote changed; review again");
      const balance = await RPC.getBalance(FOUNDER, "finalized");
      if (progress && balance > progress.initialBalance) throw Error("Funding history changed; review again");
      enforceBudget(progress ? progress.initialBalance - balance : 0, approved.debit, fee);
      if (signer) tx.partialSign(signer);
      const signed = await wallet.signTransaction(tx);
      if (!signed.verifySignatures()) throw Error("Founder's or buffer's signature missing");
      if (signer) { sessionStorage.setItem(PENDING_BUFFER, JSON.stringify({ address: signer.publicKey.toBase58(), lastValidBlockHeight }));
        setRecoveryBuffer(signer.publicKey.toBase58()); }
      const signature = await RPC.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 0 });
      await RPC.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "finalized");
      const finalized = await RPC.getTransaction(signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
      if (!finalized || finalized.meta?.err) throw Error(`Transaction ${signature} not finalized successfully; inspect RPC before retrying`);
      if (approved.action === "create") {
        const baseline = finalized.meta!.preBalances[0];
        const next = { buffer: signer!.publicKey.toBase58(), initialBalance: baseline,
          creationSignature: signature, signatures: [signature] };
        sessionStorage.setItem(STORAGE, JSON.stringify(next)); setProgress(next); setBufferKeypair(null);
        sessionStorage.removeItem(PENDING_BUFFER); setRecoveryBuffer("");
      } else if (approved.action === "upgrade") {
        await inspectProgram(RPC, CANDIDATE_SHA256, CANDIDATE_LENGTH);
        const afterAccounts = await preservedAccounts();
        if (JSON.stringify(beforeAccounts) !== JSON.stringify(afterAccounts)) throw Error("Finalized lifecycle account state changed; inspect before continuing");
        setComplete(true);
      } else if (approved.action === "close") {
        sessionStorage.removeItem(STORAGE); setProgress(null);
      } else if (progress) {
        const next = { ...progress, signatures: [...progress.signatures, signature] };
        sessionStorage.setItem(STORAGE, JSON.stringify(next)); setProgress(next);
      }
      setStatus(`Finalized ${approved.action}: ${signature}. Independent RPC state was rechecked.`);
    } catch (error) { setStatus(`Stopped: ${String(error)}. Inspect finalized RPC state before retrying.`); }
    finally { setBusy(false); }
  }

  return <main style={{ maxWidth: 850, margin: "3rem auto", padding: "1rem" }}>
    <h1>Proof Continuity Devnet upgrade</h1>
    <p>Founder wallet: {FOUNDER.toBase58()} · Program: {PROOF_PROGRAM.toBase58()}</p>
    <p>Execution: {enabled ? "separately authorized Devnet Preview" : "disabled"} · Ceiling: {MAX_LAMPORTS} lamports</p>
    {approval && <p>Approval: <a href={approval}>Founder authorization</a></p>}
    <p>Current: {BEFORE_SHA256} · Candidate: {CANDIDATE_SHA256}</p>
    <p>Review the exact {CANDIDATE_LENGTH}-byte CI ELF. The founder upgrade authority remains in Phantom. A one-time buffer address key exists only in this tab until initialization; the buffer authority is the founder wallet. Creation, each bounded write, upgrade, and any pre-upgrade close require separate signatures.</p>
    <input type="file" accept=".so" onChange={e => void selectElf(e.target.files?.[0])} />
    <p>{status}</p>
    <p>Wallet: {wallet.publicKey?.toBase58() || "not connected"}</p>
    {!wallet.connected && <button onClick={connectPhantom}>Connect Phantom</button>}
    {wallet.connected && <button onClick={() => void wallet.disconnect()}>Disconnect wallet</button>}
    {progress && <p>Buffer: {progress.buffer} · Finalized actions: {progress.signatures.length}. Refresh resumes only from finalized RPC state.</p>}
    {!progress && recoveryBuffer && <section><p>Pending buffer address: {recoveryBuffer}. No secret key is stored. Recover only after finalized RPC confirms it.</p>
      <button disabled={!candidateReady || busy} onClick={() => void recoverFinalizedBuffer()}>Recover finalized buffer</button>
      <button disabled={busy} onClick={() => void discardExpiredUnsubmittedBuffer()}>Check expiry and discard only if unsubmitted</button></section>}
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <button disabled={!enabled || !candidateReady || !walletReady || busy || Boolean(progress)} onClick={() => void prepare("create")}>Review buffer initialization</button>
      <button disabled={!enabled || !candidateReady || !walletReady || busy || !progress} onClick={() => void prepare("write")}>Review next buffer write</button>
      <button disabled={!enabled || !candidateReady || !walletReady || busy || !progress} onClick={() => void prepare("upgrade")}>Review separate upgrade</button>
      <button disabled={!enabled || !candidateReady || !walletReady || busy || !progress} onClick={() => void prepare("close")}>Review pre-upgrade buffer close</button>
    </div>
    {review && <section><h2>Sign only this reviewed action</h2><p>{review.action}: rent debit {review.debit} lamports; quoted fee {review.fee} lamports. {review.offset !== undefined ? `Write offset ${review.offset}.` : ""}</p>
      <button disabled={busy || !enabled || !walletReady} onClick={() => void signReviewed()}>Confirm this transaction in Phantom</button>
      <button onClick={() => setReview(null)}>Cancel</button></section>}
    {complete && <p>Finalized candidate bytecode, founder authority, and all four existing lifecycle accounts verified through Devnet RPC.</p>}
  </main>;
}
