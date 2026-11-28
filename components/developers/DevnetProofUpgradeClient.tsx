"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { BEFORE_LENGTH, BEFORE_SHA256, CANDIDATE_LENGTH, CANDIDATE_SHA256, closeBuffer,
  createBuffer, DEVNET_GENESIS, enforceBudget, FOUNDER, hash, inspectBuffer, inspectCandidate, assertBatchRecovery,
  inspectProgram, LEGACY_TRANSACTION_LIMIT, MAX_ACTIONS, MAX_FEE_PER_ACTION, MAX_LAMPORTS, PROOF_PROGRAM,
  upgrade, writeBatch, writeBuffer, WRITE_BATCH, WRITE_CHUNK } from "@/lib/solana/devnetProofUpgrade";

const RPC = new Connection("https://api.devnet.solana.com", "finalized");
const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const STORAGE = "abraxas-devnet-proof-upgrade-v1";
const PENDING_BUFFER = "abraxas-devnet-proof-upgrade-pending-buffer-v1";
const PENDING_ACTION = "abraxas-devnet-proof-upgrade-pending-action-v1";
const TERMINAL = "abraxas-devnet-proof-upgrade-terminal-v1";
const PRESERVED = [
  "2FbFNQxiszgaVVyh22HPHSuAHRDPkwEr3rWzvLA6AMS9",
  "42XYEo4FSi99KE2QoCvdbB3GV7MshzjWgohowEM5m3aZ",
  "HkxkdRXD7vZewsyJgEMDnpheQJ2TEpE2WUBUyu396ReB",
  "5AsV7zezn7AQa2nFMFZ8jan5MUCKY7Ck24ZMQUjk9NyG",
];
const FOUR_FINALIZED_SIGNATURES = [
  "5R4cRxdbTTGP8qx7E9hR4yefFPAdPz7GmxA2EA9MkS6buUJh47n5v2r2aXuEnzKZ4cN8owBF5Ujucr6DWvCS33nL",
  "5BUXiiZBGdo6kn5NWL9yVL5QChs3AwPjbE6YnnFsiWg8kUAmmARTdmLL5DcnbFKujsvtZ6a4WKDmtsWUqDNJ7ZGA",
  "5ZJcJzfSgyNEHyrdWScg8E43V1YKuzQC1HKgf7YACkygRRJ5Jg1eEbryL1UaVznzCoZRVaEzetwQpZqDsqn4uwXt",
  "24ENh5KkoC7UpaHkGjMBEGNBhgR1gsnTbT2JzrB2QgZYyqiTGxVEPqZ6PsGCFDyZKezJ3SdhWvySxPogGqrhC2RW",
];
const EFFECT = {
  create: "Create one temporary loader buffer; founder pays refundable rent and the one-time buffer key signs only its creation.",
  write: "Write one bounded chunk of the approved ELF to the founder-authorized buffer.",
  batch: "Sign a bounded batch of independent ELF writes; each must finalize before the next batch.",
  upgrade: "Replace Proof Continuity bytecode, return buffer rent to the founder, and retain the founder as upgrade authority.",
  close: "Close the temporary buffer before upgrade and return its remaining rent to the founder; deployed program remains unchanged.",
};
type Progress = { buffer: string; initialBalance: number; signatures: string[]; creationSignature: string };
type Review = { action: "create" | "write" | "batch" | "upgrade" | "close"; fee: number; debit: number; offset?: number; endOffset?: number; count?: number };
type PendingAction = { action: Review["action"]; buffer: string; lastValidBlockHeight: number; offset?: number; endOffset?: number };

export function DevnetProofUpgradeClient() {
  const wallet = useWallet();
  const [enabled, setEnabled] = useState(false);
  const [probeEnabled, setProbeEnabled] = useState(false);
  const [probeApproval, setProbeApproval] = useState<string | null>(null);
  const [approval, setApproval] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Uint8Array | null>(null);
  const [candidateReady, setCandidateReady] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [recoveryBuffer, setRecoveryBuffer] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [bufferKeypair, setBufferKeypair] = useState<Keypair | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [status, setStatus] = useState("Select the reviewed ELF for a read-only preflight.");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [terminal, setTerminal] = useState(false);
  const [connectRequested, setConnectRequested] = useState(false);
  const walletReady = wallet.publicKey?.equals(FOUNDER) && Boolean(wallet.signTransaction);

  useEffect(() => {
    setTerminal(Boolean(localStorage.getItem(TERMINAL)));
    const saved = localStorage.getItem(STORAGE);
    if (saved) try { const p = JSON.parse(saved) as Progress;
      if (new PublicKey(p.buffer) && Number.isSafeInteger(p.initialBalance) &&
          Array.isArray(p.signatures) && typeof p.creationSignature === "string") setProgress(p);
      else throw Error("Incomplete progress record");
    } catch { setTerminal(true); setStatus("Stored public upgrade progress is malformed; stop and reconcile finalized RPC state"); }
    const pending = localStorage.getItem(PENDING_BUFFER);
    if (pending) try { setRecoveryBuffer(JSON.parse(pending).address); }
      catch { setTerminal(true); setStatus("Pending buffer record is malformed; stop and inspect RPC state"); }
    const action = localStorage.getItem(PENDING_ACTION);
    if (action) try { setPendingAction(JSON.parse(action)); }
      catch { setTerminal(true); setStatus("Pending transaction record is malformed; stop and inspect RPC state"); }
    void fetch("/api/devnet-proof-upgrade/authorization", { cache: "no-store" })
      .then(r => r.json()).then(x => { setEnabled(x.enabled === true && x.maxLamports === MAX_LAMPORTS);
        setApproval(x.approvalReference || null); setProbeEnabled(x.probeEnabled === true);
        setProbeApproval(x.probeApprovalReference || null); }).catch(() => { setEnabled(false); setProbeEnabled(false); });
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
      let before;
      try { before = await inspectProgram(RPC, BEFORE_SHA256, BEFORE_LENGTH); }
      catch (error) {
        // A page or RPC failure after a finalized upgrade must not suggest replay.
        const deployed = await inspectProgram(RPC, CANDIDATE_SHA256, CANDIDATE_LENGTH).catch(() => null);
        if (!deployed) throw error;
        await inspectCandidate(bytes, deployed.allocation);
        await preservedAccounts();
        localStorage.setItem(TERMINAL, "upgraded"); setTerminal(true); setComplete(true);
        setStatus("Candidate is already finalized on Devnet with founder authority; existing lifecycle accounts remain intact. No transaction is needed.");
        return;
      }
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

  async function quoteWriteBatch(buffer: PublicKey, bytes: Uint8Array, offset: number, blockhash: string) {
    const planned = writeBatch(buffer, bytes, offset);
    const transactions = planned.map(({ instruction }) =>
      new Transaction({ feePayer: FOUNDER, recentBlockhash: blockhash }).add(instruction));
    const fees = await Promise.all(transactions.map(async tx => {
      const size = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).length;
      if (size > LEGACY_TRANSACTION_LIMIT) throw Error(`Buffer write exceeds legacy transaction limit: ${size}`);
      const fee = (await RPC.getFeeForMessage(tx.compileMessage(), "finalized")).value;
      if (fee === null || fee > MAX_FEE_PER_ACTION) throw Error("Batch fee unavailable or above per-action limit");
      return fee;
    }));
    return { planned, transactions, fee: fees.reduce((sum, value) => sum + value, 0) };
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
      localStorage.setItem(STORAGE, JSON.stringify(next)); localStorage.removeItem(PENDING_BUFFER);
      setProgress(next); setRecoveryBuffer(""); setStatus(`Recovered ${finalized.length} finalized buffer actions through Devnet RPC.`);
    } catch (error) { setStatus(`Recovery stopped: ${String(error)}`); }
    finally { setBusy(false); }
  }

  async function discardExpiredUnsubmittedBuffer() {
    setBusy(true);
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_BUFFER) || "null") as
        { address: string; lastValidBlockHeight: number } | null;
      if (!pending || pending.address !== recoveryBuffer || !Number.isSafeInteger(pending.lastValidBlockHeight))
        throw Error("Pending buffer record is incomplete");
      if (await RPC.getBlockHeight("finalized") <= pending.lastValidBlockHeight)
        throw Error("Creation blockhash is still live; wait before discarding");
      const address = new PublicKey(pending.address);
      if (await RPC.getAccountInfo(address, "finalized") ||
          (await RPC.getSignaturesForAddress(address, { limit: 1 }, "finalized")).length)
        throw Error("Buffer may have finalized; recover it instead");
      localStorage.removeItem(PENDING_BUFFER); setRecoveryBuffer(""); setBufferKeypair(null);
      setStatus("Expired unsubmitted buffer address cleared; no account or transaction exists at finalized commitment.");
    } catch (error) { setStatus(`Discard stopped: ${String(error)}`); }
    finally { setBusy(false); }
  }

  async function resolveInterruptedAction() {
    if (!pendingAction || !candidate) return;
    setBusy(true);
    try {
      if (await RPC.getGenesisHash() !== DEVNET_GENESIS ||
          await RPC.getBlockHeight("finalized") <= pendingAction.lastValidBlockHeight)
        throw Error("Wrong cluster or transaction blockhash still live");
      const buffer = new PublicKey(pendingAction.buffer);
      if (pendingAction.action === "create") {
        const exists = await RPC.getAccountInfo(buffer, "finalized");
        if (exists) {
          await recoverFinalizedBuffer();
          if (!localStorage.getItem(STORAGE)) throw Error("Buffer exists but recovery was not proven");
        }
      } else if (pendingAction.action === "batch") {
        const state = await inspectBuffer(RPC, buffer, candidate);
        assertBatchRecovery(candidate, pendingAction.offset!, pendingAction.endOffset!, state.nextOffset);
        if (!progress || progress.buffer !== buffer.toBase58()) throw Error("Missing founder-paid buffer history");
        const history = await RPC.getSignaturesForAddress(buffer, { limit: 1000 }, "finalized");
        if (history.length === 1000 || history.some(x => x.confirmationStatus !== "finalized"))
          throw Error("Complete finalized batch history unavailable");
        const next = { ...progress, signatures: history.reverse().filter(x => !x.err).map(x => x.signature) };
        if (next.signatures[0] !== progress.creationSignature) throw Error("Buffer creation history changed");
        localStorage.setItem(STORAGE, JSON.stringify(next)); setProgress(next);
      } else if (pendingAction.action === "write") {
        const state = await inspectBuffer(RPC, buffer, candidate);
        if (state.nextOffset !== pendingAction.offset && state.nextOffset !== pendingAction.offset! + WRITE_CHUNK &&
            !state.complete) throw Error("Buffer bytes changed unexpectedly");
      } else if (pendingAction.action === "upgrade") {
        const upgraded = await inspectProgram(RPC, CANDIDATE_SHA256, CANDIDATE_LENGTH).catch(() => null);
        if (upgraded) { await preservedAccounts(); localStorage.setItem(TERMINAL, "upgraded"); setTerminal(true); setComplete(true); }
        else await inspectProgram(RPC, BEFORE_SHA256, BEFORE_LENGTH);
      } else {
        const account = await RPC.getAccountInfo(buffer, "finalized");
        if (!account) { localStorage.removeItem(STORAGE); setProgress(null);
          localStorage.setItem(TERMINAL, "closed"); setTerminal(true); }
        else await inspectBuffer(RPC, buffer, candidate);
      }
      localStorage.removeItem(PENDING_ACTION); setPendingAction(null);
      setStatus("Interrupted action resolved from finalized RPC after blockhash expiry. Review the next action afresh.");
    } catch (error) { setStatus(`Interrupted action unresolved: ${String(error)}`); }
    finally { setBusy(false); }
  }

  async function preservedAccounts() {
    const signatures = await Promise.all(FOUR_FINALIZED_SIGNATURES.map(signature =>
      RPC.getTransaction(signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 })));
    if (signatures.some(x => !x?.meta || x.meta.err)) throw Error("One of the four prior lifecycle transactions is not finalized successfully");
    const infos = await RPC.getMultipleAccountsInfo(PRESERVED.map(x => new PublicKey(x)), "finalized");
    if (infos.some(x => !x || x.data.length === 0)) throw Error("One of the four finalized lifecycle accounts is missing");
    return Promise.all(infos.map(async x => ({ owner: x!.owner.toBase58(), digest: await hash(x!.data) })));
  }

  async function prepare(action: Exclude<Review["action"], "batch">) {
    if (!candidate || !candidateReady || !walletReady || !enabled || busy || pendingAction || terminal) return;
    setBusy(true); setReview(null);
    try {
      if (localStorage.getItem(TERMINAL) || localStorage.getItem(PENDING_ACTION) ||
          (!progress && localStorage.getItem(STORAGE))) throw Error("Another tab or an interrupted action owns this approval; reload and reconcile state");
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
      const actions = progress ? (await RPC.getSignaturesForAddress(new PublicKey(progress.buffer), { limit: 1000 }, "finalized")).length : 0;
      const lockedRent = progress ? await RPC.getMinimumBalanceForRentExemption(37 + CANDIDATE_LENGTH, "finalized") : debit;
      if (actions >= MAX_ACTIONS || lockedRent + (actions + 1) * MAX_FEE_PER_ACTION > MAX_LAMPORTS)
        throw Error("Conservative on-chain action-count budget exhausted");
      enforceBudget(spent, debit, fee);
      if (balance < debit + fee + 50_000_000) throw Error("Insufficient Devnet SOL including 0.05 SOL safety reserve");
      setReview({ action, fee, debit, offset });
      setStatus(`Review ${action}: ${debit} lamports refundable buffer rent, ${fee} lamports estimated fee, ${spent} lamports already debited. This requires a separate Phantom transaction confirmation.`);
    } catch (error) { setStatus(String(error)); }
    finally { setBusy(false); }
  }

  async function prepareBatch() {
    if (!candidate || !candidateReady || !walletReady || !wallet.signAllTransactions ||
        !enabled || !progress || busy || pendingAction || terminal) return;
    setBusy(true); setReview(null);
    try {
      if (localStorage.getItem(TERMINAL) || localStorage.getItem(PENDING_ACTION))
        throw Error("Another tab or interrupted batch owns this approval");
      const before = await inspectProgram(RPC, BEFORE_SHA256, BEFORE_LENGTH);
      await inspectCandidate(candidate, before.allocation);
      const { buffer, state } = await currentBuffer();
      if (state.complete) throw Error("All buffer bytes are finalized");
      const { blockhash } = await RPC.getLatestBlockhash("finalized");
      const quote = await quoteWriteBatch(buffer, candidate, state.nextOffset, blockhash);
      const balance = await RPC.getBalance(FOUNDER, "finalized");
      if (balance > progress.initialBalance) throw Error("Funding history changed; reconcile before signing");
      const actions = (await RPC.getSignaturesForAddress(buffer, { limit: 1000 }, "finalized")).length;
      const rent = await RPC.getMinimumBalanceForRentExemption(37 + CANDIDATE_LENGTH, "finalized");
      if (actions + quote.planned.length > MAX_ACTIONS ||
          rent + (actions + quote.planned.length) * MAX_FEE_PER_ACTION > MAX_LAMPORTS)
        throw Error("Conservative whole-journey budget exhausted");
      enforceBudget(progress.initialBalance - balance, 0, quote.fee);
      if (balance < quote.fee + 50_000_000) throw Error("Insufficient Devnet SOL including safety reserve");
      const endOffset = Math.min(CANDIDATE_LENGTH, state.nextOffset + quote.planned.length * WRITE_CHUNK);
      setReview({ action: "batch", fee: quote.fee, debit: 0, offset: state.nextOffset,
        endOffset, count: quote.planned.length });
      setStatus(`Review ${quote.planned.length} independently signed writes, byte range ${state.nextOffset}–${endOffset - 1}, total quoted fees ${quote.fee} lamports. Phantom may show one batch approval; its actual behavior remains unverified.`);
    } catch (error) { setStatus(String(error)); }
    finally { setBusy(false); }
  }

  async function signReviewed() {
    if (!review || review.action === "batch" || !enabled || !walletReady || !wallet.signTransaction || !candidate || busy || pendingAction || terminal) return;
    const signTransaction = wallet.signTransaction;
    if (!navigator.locks) { setStatus("This browser cannot lock concurrent upgrade tabs; use a browser with Web Locks support"); return; }
    await navigator.locks.request("abraxas-devnet-proof-upgrade", { mode: "exclusive" }, async () => {
    setBusy(true); const approved = review; setReview(null);
    try {
      if (localStorage.getItem(TERMINAL) || localStorage.getItem(PENDING_ACTION) ||
          (!progress && localStorage.getItem(STORAGE))) throw Error("Another tab or interrupted action owns this approval; reload and reconcile state");
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
      const actions = progress ? (await RPC.getSignaturesForAddress(new PublicKey(progress.buffer), { limit: 1000 }, "finalized")).length : 0;
      const lockedRent = progress ? await RPC.getMinimumBalanceForRentExemption(37 + CANDIDATE_LENGTH, "finalized") : approved.debit;
      if (actions >= MAX_ACTIONS || lockedRent + (actions + 1) * MAX_FEE_PER_ACTION > MAX_LAMPORTS)
        throw Error("Conservative on-chain action-count budget exhausted");
      enforceBudget(progress ? progress.initialBalance - balance : 0, approved.debit, fee);
      if (signer) tx.partialSign(signer);
      const signed = await signTransaction(tx);
      if (!signed.verifySignatures()) throw Error("Founder's or buffer's signature missing");
      if (signer) { localStorage.setItem(PENDING_BUFFER, JSON.stringify({ address: signer.publicKey.toBase58(), lastValidBlockHeight }));
        setRecoveryBuffer(signer.publicKey.toBase58()); }
      const pending = { action: approved.action, buffer: signer?.publicKey.toBase58() || progress!.buffer,
        lastValidBlockHeight, offset: approved.offset };
      localStorage.setItem(PENDING_ACTION, JSON.stringify(pending)); setPendingAction(pending);
      const signature = await RPC.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 0 });
      await RPC.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "finalized");
      const finalized = await RPC.getTransaction(signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
      if (!finalized || finalized.meta?.err) throw Error(`Transaction ${signature} not finalized successfully; inspect RPC before retrying`);
      if (approved.action === "create") {
        const baseline = finalized.meta!.preBalances[0];
        const next = { buffer: signer!.publicKey.toBase58(), initialBalance: baseline,
          creationSignature: signature, signatures: [signature] };
        localStorage.setItem(STORAGE, JSON.stringify(next)); setProgress(next); setBufferKeypair(null);
        localStorage.removeItem(PENDING_BUFFER); setRecoveryBuffer("");
      } else if (approved.action === "upgrade") {
        await inspectProgram(RPC, CANDIDATE_SHA256, CANDIDATE_LENGTH);
        const afterAccounts = await preservedAccounts();
        if (JSON.stringify(beforeAccounts) !== JSON.stringify(afterAccounts)) throw Error("Finalized lifecycle account state changed; inspect before continuing");
        localStorage.setItem(TERMINAL, "upgraded"); setTerminal(true); setComplete(true);
      } else if (approved.action === "close") {
        localStorage.removeItem(STORAGE); setProgress(null);
        localStorage.setItem(TERMINAL, "closed"); setTerminal(true);
      } else if (progress) {
        const next = { ...progress, signatures: [...progress.signatures, signature] };
        localStorage.setItem(STORAGE, JSON.stringify(next)); setProgress(next);
      }
      localStorage.removeItem(PENDING_ACTION); setPendingAction(null);
      setStatus(`Finalized ${approved.action}: ${signature}. Independent RPC state was rechecked.`);
    } catch (error) {
      const message = String(error);
      setStatus(!localStorage.getItem(PENDING_ACTION) && /reject|declin|cancel/i.test(message)
        ? "Phantom declined this action. Nothing was submitted; review it again when ready."
        : `Stopped: ${message}. Reconcile finalized RPC state before retrying.`);
    }
    finally { setBusy(false); }
    });
  }

  async function signReviewedBatch() {
    if (review?.action !== "batch" || !candidate || !progress || !enabled || !walletReady ||
        !wallet.signAllTransactions || busy || pendingAction || terminal) return;
    if (!navigator.locks) { setStatus("Concurrent-tab locking is unavailable"); return; }
    await navigator.locks.request("abraxas-devnet-proof-upgrade", { mode: "exclusive" }, async () => {
      setBusy(true); const approved = review; setReview(null);
      try {
        if (localStorage.getItem(TERMINAL) || localStorage.getItem(PENDING_ACTION))
          throw Error("Another tab or interrupted batch owns this approval");
        const before = await inspectProgram(RPC, BEFORE_SHA256, BEFORE_LENGTH);
        await inspectCandidate(candidate, before.allocation);
        const { buffer, state } = await currentBuffer();
        if (state.complete || state.nextOffset !== approved.offset) throw Error("Buffer progressed; review again");
        const { blockhash, lastValidBlockHeight } = await RPC.getLatestBlockhash("finalized");
        const quote = await quoteWriteBatch(buffer, candidate, state.nextOffset, blockhash);
        const endOffset = Math.min(CANDIDATE_LENGTH, state.nextOffset + quote.planned.length * WRITE_CHUNK);
        if (quote.planned.length !== approved.count || endOffset !== approved.endOffset || quote.fee > approved.fee)
          throw Error("Batch contents or fee changed; review again");
        const balance = await RPC.getBalance(FOUNDER, "finalized");
        if (balance > progress.initialBalance) throw Error("Funding history changed; review again");
        const actions = (await RPC.getSignaturesForAddress(buffer, { limit: 1000 }, "finalized")).length;
        const rent = await RPC.getMinimumBalanceForRentExemption(37 + CANDIDATE_LENGTH, "finalized");
        if (actions + quote.planned.length > MAX_ACTIONS ||
            rent + (actions + quote.planned.length) * MAX_FEE_PER_ACTION > MAX_LAMPORTS)
          throw Error("Conservative whole-journey budget exhausted");
        enforceBudget(progress.initialBalance - balance, 0, quote.fee);
        if (balance < quote.fee + 50_000_000) throw Error("Insufficient Devnet SOL including safety reserve");
        // Every returned transaction must be byte-for-byte the reviewed message, signed
        // by the founder. No transaction is submitted until the entire batch passes.
        const signed = await wallet.signAllTransactions(quote.transactions);
        if (signed.length !== quote.transactions.length) throw Error("Wallet returned an incomplete batch");
        signed.forEach((tx, index) => {
          if (!tx.serializeMessage().equals(quote.transactions[index].serializeMessage()) || !tx.verifySignatures())
            throw Error(`Batch transaction ${index} was altered or lacks founder authorization`);
        });
        const pending: PendingAction = { action: "batch", buffer: buffer.toBase58(),
          lastValidBlockHeight, offset: state.nextOffset, endOffset };
        localStorage.setItem(PENDING_ACTION, JSON.stringify(pending)); setPendingAction(pending);
        const submitted: string[] = [];
        for (let index = 0; index < signed.length; index++) {
          const signature = await RPC.sendRawTransaction(signed[index].serialize(), { skipPreflight: false, maxRetries: 0 });
          submitted.push(signature);
          const confirmed = await RPC.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
          if (confirmed.value.err) throw Error(`Write ${index} failed at confirmed commitment: ${signature}`);
        }
        let currentProgress: Progress = progress;
        for (let index = 0; index < submitted.length; index++) {
          const signature = submitted[index];
          const confirmation = await RPC.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "finalized");
          if (confirmation.value.err) throw Error(`Write ${index} failed at finalized commitment: ${signature}`);
          const finalized = await RPC.getTransaction(signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
          if (!finalized || finalized.meta?.err) throw Error(`Write ${index} did not finalize successfully: ${signature}`);
          const next = { ...currentProgress, signatures: [...currentProgress.signatures, signature] };
          localStorage.setItem(STORAGE, JSON.stringify(next)); setProgress(next);
          currentProgress = next;
        }
        const checked = await inspectBuffer(RPC, buffer, candidate);
        assertBatchRecovery(candidate, state.nextOffset, endOffset, checked.nextOffset, true);
        localStorage.removeItem(PENDING_ACTION); setPendingAction(null);
        setStatus(`Finalized ${signed.length} writes through Devnet RPC; next offset ${endOffset}. Review another bounded batch.`);
      } catch (error) {
        const message = String(error);
        setStatus(!localStorage.getItem(PENDING_ACTION) && /reject|declin|cancel/i.test(message)
          ? "Phantom declined the batch. Nothing was submitted; review it again when ready."
          : `Batch stopped: ${message}. Reconcile finalized RPC after blockhash expiry before retrying.`);
      } finally { setBusy(false); }
    });
  }

  async function testBatchSigningOnly() {
    if (!probeEnabled || !wallet.publicKey?.equals(FOUNDER) || !wallet.signAllTransactions || busy) return;
    setBusy(true);
    try {
      if (await RPC.getGenesisHash() !== DEVNET_GENESIS) throw Error("Wrong Devnet genesis");
      const { blockhash } = await RPC.getLatestBlockhash("finalized");
      const transactions = Array.from({ length: WRITE_BATCH }, (_, index) =>
        new Transaction({ feePayer: FOUNDER, recentBlockhash: blockhash }).add(
          new TransactionInstruction({ programId: MEMO, keys: [],
            data: Buffer.from(new TextEncoder().encode(`Abraxas Devnet batch-sign probe ${index + 1}/${WRITE_BATCH}; never submit`)) })));
      const signed = await wallet.signAllTransactions(transactions);
      if (signed.length !== transactions.length || signed.some((tx, index) =>
        !tx.serializeMessage().equals(transactions[index].serializeMessage()) || !tx.verifySignatures()))
        throw Error("Phantom returned missing or changed signatures");
      // Signed transactions exist only in this call. There is intentionally no RPC send,
      // transaction serialization to storage, or downstream execution callback.
      setStatus(`Phantom signed ${WRITE_BATCH} distinct Devnet memo transactions in one request; signatures verified locally. No transaction was submitted or stored.`);
    } catch (error) { setStatus(`Batch-sign probe stopped: ${String(error)}. No transaction was submitted.`); }
    finally { setBusy(false); }
  }

  return <main style={{ maxWidth: 850, margin: "3rem auto", padding: "1rem" }}>
    <h1>Proof Continuity Devnet upgrade</h1>
    <p>Founder wallet: {FOUNDER.toBase58()} · Program: {PROOF_PROGRAM.toBase58()}</p>
    <p>Execution: {enabled ? "separately authorized Devnet Preview" : "disabled"} · Ceiling: {MAX_LAMPORTS} lamports</p>
    {approval && <p>Approval: <a href={approval}>Founder authorization</a></p>}
    <p>Batch-sign acceptance: {probeEnabled ? "separately authorized, signing only" : "disabled"}. This probe never submits transactions and does not enable the upgrade.</p>
    {probeApproval && <p>Probe approval: <a href={probeApproval}>Founder authorization</a></p>}
    <p>Current: {BEFORE_SHA256} · Candidate: {CANDIDATE_SHA256}</p>
    <p>Review the exact {CANDIDATE_LENGTH}-byte CI ELF. The founder upgrade authority remains in Phantom. A one-time buffer address key exists only in this tab until initialization; the buffer authority is the founder wallet. Bounded batches may group {WRITE_BATCH} independently verified writes per Phantom request. Buffer creation, final upgrade and any pre-upgrade close remain separate approvals.</p>
    <input type="file" accept=".so" onChange={e => void selectElf(e.target.files?.[0])} />
    <p>{status}</p>
    <p>Wallet: {wallet.publicKey?.toBase58() || "not connected"}</p>
    {!wallet.connected && <button onClick={connectPhantom}>Connect Phantom</button>}
    {wallet.connected && <button onClick={() => void wallet.disconnect()}>Disconnect wallet</button>}
    <button disabled={!probeEnabled || !wallet.publicKey?.equals(FOUNDER) || !wallet.signAllTransactions || busy}
      onClick={() => void testBatchSigningOnly()}>Test {WRITE_BATCH}-transaction Phantom batch signing only — no submission</button>
    {progress && <p>Buffer: {progress.buffer} · Finalized actions: {progress.signatures.length}. Refresh resumes only from finalized RPC state.</p>}
    {terminal && <p>This approved upgrade attempt is complete or closed. A new attempt requires a separately authorized recovery procedure.</p>}
    {!progress && <section><label>Recover an existing public buffer address
      <input value={recoveryBuffer} onChange={e => setRecoveryBuffer(e.target.value.trim())} placeholder="Public buffer address" /></label>
      <p>No private key is stored. Recovery requires finalized buffer authority, exact candidate bytes, and founder-paid creation evidence.</p>
      <button disabled={!candidateReady || busy || !recoveryBuffer || Boolean(pendingAction)} onClick={() => void recoverFinalizedBuffer()}>Recover finalized buffer</button>
      {recoveryBuffer && <button disabled={busy} onClick={() => void discardExpiredUnsubmittedBuffer()}>Check expiry and discard only if unsubmitted</button>}</section>}
    {pendingAction && <p>Uncertain {pendingAction.action} transaction. No new signature is allowed until its blockhash expires and finalized RPC state is reconciled.
      <button disabled={!candidateReady || busy} onClick={() => void resolveInterruptedAction()}>Resolve interrupted action</button></p>}
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <button disabled={!enabled || !candidateReady || !walletReady || busy || Boolean(progress) || Boolean(pendingAction) || terminal} onClick={() => void prepare("create")}>Review buffer initialization</button>
      <button disabled={!enabled || !candidateReady || !walletReady || busy || !progress || Boolean(pendingAction) || terminal} onClick={() => void prepare("write")}>Review next buffer write</button>
      <button disabled={!enabled || !candidateReady || !walletReady || !wallet.signAllTransactions || busy || !progress || Boolean(pendingAction) || terminal} onClick={() => void prepareBatch()}>Review next bounded batch</button>
      <button disabled={!enabled || !candidateReady || !walletReady || busy || !progress || Boolean(pendingAction) || terminal} onClick={() => void prepare("upgrade")}>Review separate upgrade</button>
      <button disabled={!enabled || !candidateReady || !walletReady || busy || !progress || Boolean(pendingAction) || terminal} onClick={() => void prepare("close")}>Review pre-upgrade buffer close</button>
    </div>
    {review && <section><h2>Sign only this reviewed action</h2><p>{review.action}: rent debit {review.debit} lamports; quoted fee {review.fee} lamports. {review.offset !== undefined ? `Byte range ${review.offset}–${(review.endOffset ?? Math.min(CANDIDATE_LENGTH, review.offset + WRITE_CHUNK)) - 1}.` : ""} {review.count ? `${review.count} separate transactions.` : ""}</p><p>{EFFECT[review.action]} Fee payer and upgrade authority: {FOUNDER.toBase58()}.</p>
      <button disabled={busy || !enabled || !walletReady} onClick={() => void (review.action === "batch" ? signReviewedBatch() : signReviewed())}>Confirm {review.action === "batch" ? "bounded batch" : "this transaction"} in Phantom</button>
      <button onClick={() => setReview(null)}>Cancel</button></section>}
    {complete && <p>Finalized candidate bytecode, founder authority, and all four existing lifecycle accounts verified through Devnet RPC.</p>}
  </main>;
}
