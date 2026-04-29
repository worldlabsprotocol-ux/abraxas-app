"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/Button";
import { WalletGate } from "@/components/WalletGate";
import { mockVaults } from "@/lib/mockData";
import { VAULT_YIELD_RATES } from "@/lib/usePortfolioData";
import { formatCurrency } from "@/lib/utils";

const TYPE_DEFAULTS: Record<string, { category: string; vaultId: string }> = {
  music:       { category: "Music & IP Royalties", vaultId: "490" },
  realestate:  { category: "Real Estate",          vaultId: "492" },
  receivables: { category: "Receivables",          vaultId: "493" },
};

const CATEGORIES = [
  "Music & IP Royalties",
  "Real Estate",
  "Receivables / Invoices",
  "Athletic Equity",
  "Maritime / Shipping",
  "Cannabis / Agriculture",
  "Other",
];

const VAULT_OPTIONS = mockVaults.map((v) => ({
  id: v.id,
  label: `${v.name} — ${v.assetClass} (${VAULT_YIELD_RATES[v.id] ?? v.yieldYTD}% APY)`,
}));

/** Proof type labels and accepted file types */
const PROOF_TYPES = [
  { k: "document", label: "Document", sub: "PDF, DOC", accept: ".pdf,.doc,.docx" },
  { k: "onchain",  label: "On-chain", sub: "TX hash",  accept: null },
  { k: "contract", label: "Contract", sub: "PDF, DOC", accept: ".pdf,.doc,.docx" },
];

type Step = 1 | 2 | 3;

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

interface FormData {
  name: string;
  category: string;
  value: string;
  description: string;
  proofType: string;
  proofFile: UploadedFile | null;
  proofHash: string;
  vaultId: string;
}

function ListWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams?.get("type") ?? "";
  const defaults = TYPE_DEFAULTS[typeParam] ?? { category: "", vaultId: "490" };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [form, setForm] = useState<FormData>({
    name: "", category: defaults.category, value: "",
    description: "", proofType: "document",
    proofFile: null, proofHash: "", vaultId: defaults.vaultId,
  });

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleFile = (file: File) => {
    set("proofFile", { name: file.name, size: file.size, type: file.type });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const removeFile = () => {
    set("proofFile", null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectedVault = mockVaults.find((v) => v.id === form.vaultId);
  const yieldRate = VAULT_YIELD_RATES[form.vaultId] ?? 9.0;
  const projectedYield = form.value
    ? Math.round(parseFloat(form.value.replace(/[^0-9.]/g, "")) * yieldRate / 100) || 0
    : 0;

  const step1Valid = !!form.name && !!form.category && !!form.value;
  const proofValid = form.proofType === "onchain"
    ? form.proofHash.length > 10
    : form.proofFile !== null;

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setDone(true); }, 1600);
  };

  if (done) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "5rem 1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1.5rem" }}>◎</div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.5rem", marginBottom: "0.75rem" }}>
          Asset registered.
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: "0.5rem" }}>
          <strong style={{ color: "var(--text)" }}>{form.name}</strong> has been submitted for vault assignment.
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: "2rem" }}>
          Connect your wallet and deposit to activate your agent and mint your Token-2022 position on Solana.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Button size="lg" onClick={() => router.push(`/deposit/${form.vaultId}`)}>Deposit to Vault</Button>
          <Button size="lg" variant="ghost" onClick={() => router.push("/app")}>Dashboard</Button>
        </div>
      </div>
    );
  }

  const stepLabels = ["Asset Details", "Vault Assignment", "Confirm"];

  return (
    <div style={{ maxWidth: "660px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <button onClick={() => router.back()} style={{ fontSize: "0.75rem", color: "var(--subtle)", background: "none", border: "none", cursor: "pointer", marginBottom: "1.5rem" }}>
        ← Back
      </button>

      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(1.4rem, 3vw, 2rem)", letterSpacing: "-0.01em", marginBottom: "0.5rem" }}>
        Register an Asset
      </h1>
      <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "2rem", lineHeight: 1.65 }}>
        Bring your real-world asset into Abraxas. Your agent will manage it from here.
      </p>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: "0", marginBottom: "2.5rem" }}>
        {stepLabels.map((label, i) => {
          const n = (i + 1) as Step;
          const active = step === n;
          const isDone = step > n;
          return (
            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", position: "relative" }}>
              {i < stepLabels.length - 1 && (
                <div style={{ position: "absolute", top: "13px", left: "50%", right: "-50%", height: "1px", background: isDone ? "var(--gold)" : "var(--line)", zIndex: 0 }} />
              )}
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: isDone ? "var(--gold)" : active ? "var(--surface)" : "var(--deep)",
                border: `1px solid ${isDone || active ? "var(--gold)" : "var(--line)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.65rem", fontWeight: 700,
                color: isDone ? "var(--void)" : active ? "var(--gold)" : "var(--subtle)",
                zIndex: 1, position: "relative",
              }}>
                {isDone ? "✓" : n}
              </div>
              <span style={{ fontSize: "0.6rem", letterSpacing: "0.06em", textTransform: "uppercase", color: active ? "var(--gold)" : "var(--subtle)" }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Asset Name *</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Atlas Royalty Catalog, 401 Main Street, Invoice Batch Q2" />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Asset Category *</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Estimated Value (USD) *</label>
            <input value={form.value} onChange={(e) => set("value", e.target.value)} placeholder="e.g. 50000" type="number" min="0" />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Description</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Brief description of the asset and its income stream." style={{ minHeight: "80px" }} />
          </div>

          {/* ── PROOF OF OWNERSHIP ── */}
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>
              Proof of Ownership *
            </label>

            {/* Type selector */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
              {PROOF_TYPES.map((p) => (
                <div
                  key={p.k}
                  onClick={() => { set("proofType", p.k); set("proofFile", null); set("proofHash", ""); }}
                  style={{
                    border: `1px solid ${form.proofType === p.k ? "var(--gold)" : "var(--line)"}`,
                    borderRadius: "8px", padding: "0.65rem 0.5rem", textAlign: "center",
                    cursor: "pointer",
                    background: form.proofType === p.k ? "rgba(200,169,110,0.06)" : "var(--surface)",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: form.proofType === p.k ? "var(--gold)" : "var(--text)", marginBottom: "0.15rem" }}>{p.label}</div>
                  <div style={{ fontSize: "0.62rem", color: "var(--subtle)" }}>{p.sub}</div>
                </div>
              ))}
            </div>

            {/* On-chain hash input */}
            {form.proofType === "onchain" && (
              <input
                value={form.proofHash}
                onChange={(e) => set("proofHash", e.target.value)}
                placeholder="Transaction hash or token address"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem" }}
              />
            )}

            {/* File upload drop zone */}
            {form.proofType !== "onchain" && (
              <>
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={PROOF_TYPES.find((p) => p.k === form.proofType)?.accept ?? "*"}
                  onChange={handleFileInput}
                  style={{ display: "none" }}
                  id="proof-upload"
                />

                {form.proofFile ? (
                  /* File uploaded state */
                  <div style={{
                    border: "1px solid rgba(61,214,140,0.3)",
                    borderRadius: "10px", padding: "1rem 1.25rem",
                    background: "rgba(61,214,140,0.04)",
                    display: "flex", alignItems: "center", gap: "0.875rem",
                  }}>
                    <div style={{ fontSize: "1.25rem", flexShrink: 0 }}>
                      {form.proofFile.name.endsWith(".pdf") ? "📄" : "📝"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {form.proofFile.name}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--subtle)", marginTop: "0.15rem" }}>
                        {(form.proofFile.size / 1024).toFixed(0)} KB · {form.proofFile.type || "document"}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--green)", fontWeight: 600 }}>✓ Uploaded</span>
                      <button
                        onClick={removeFile}
                        style={{ background: "none", border: "none", color: "var(--subtle)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: "0.2rem" }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Drop zone */
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragOver ? "var(--gold)" : "rgba(255,255,255,0.12)"}`,
                      borderRadius: "10px", padding: "2rem 1.5rem",
                      textAlign: "center", cursor: "pointer",
                      background: dragOver ? "rgba(200,169,110,0.04)" : "transparent",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>↑</div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>
                      {dragOver ? "Drop to upload" : "Click to upload or drag & drop"}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--subtle)" }}>
                      PDF, DOC · Deed, title, contract, PRO registration
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <Button
            size="lg" fullWidth
            disabled={!step1Valid || (form.proofType !== "onchain" ? !form.proofFile : !form.proofHash)}
            onClick={() => setStep(2)}
          >
            Next: Vault Assignment
          </Button>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>
              Select Vault
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {VAULT_OPTIONS.map((v) => (
                <div
                  key={v.id}
                  onClick={() => set("vaultId", v.id)}
                  style={{
                    border: `1px solid ${form.vaultId === v.id ? "var(--gold)" : "var(--line)"}`,
                    borderRadius: "10px", padding: "0.875rem 1.25rem",
                    cursor: "pointer",
                    background: form.vaultId === v.id ? "rgba(200,169,110,0.05)" : "var(--surface)",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ fontSize: "0.82rem", fontWeight: form.vaultId === v.id ? 600 : 400, color: form.vaultId === v.id ? "var(--text)" : "var(--muted)" }}>
                    {v.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {projectedYield > 0 && (
            <div style={{ background: "rgba(61,214,140,0.05)", border: "1px solid rgba(61,214,140,0.2)", borderRadius: "10px", padding: "1rem 1.25rem" }}>
              <div style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.4rem" }}>
                Projected Annual Yield
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.5rem", color: "var(--green)" }}>
                {formatCurrency(projectedYield)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--subtle)", marginTop: "0.2rem" }}>
                Based on {yieldRate}% rate · ${parseFloat(form.value || "0").toLocaleString()} asset value
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Button size="lg" variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button size="lg" fullWidth onClick={() => setStep(3)}>Review & Submit</Button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.5rem" }}>
            <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "1rem" }}>Review</p>
            {[
              { label: "Asset Name",  value: form.name },
              { label: "Category",    value: form.category },
              { label: "Value",       value: `$${parseFloat(form.value || "0").toLocaleString()}` },
              { label: "Proof",       value: form.proofType === "onchain" ? `Hash: ${form.proofHash.slice(0, 12)}…` : form.proofFile?.name ?? "—" },
              { label: "Vault",       value: selectedVault?.name ?? form.vaultId },
              { label: "APY",         value: `${yieldRate}%` },
              { label: "Est. Yield",  value: projectedYield > 0 ? formatCurrency(projectedYield) + "/yr" : "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--subtle)" }}>{label}</span>
                <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--text)", maxWidth: "220px", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(107,140,255,0.05)", border: "1px solid rgba(107,140,255,0.15)", borderRadius: "10px", padding: "1rem" }}>
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.65 }}>
              By submitting, you authorize Abraxas to assign an autonomous agent and prepare a Token-2022 position on Solana. Non-custodial — you retain full ownership of the underlying asset.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Button size="lg" variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button size="lg" fullWidth disabled={submitting} onClick={handleSubmit}>
              {submitting ? "Submitting…" : "Confirm & Activate"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ListPage() {
  return (
    <WalletGate>
      <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center", color: "var(--subtle)" }}>Loading…</div>}>
        <ListWizard />
      </Suspense>
    </WalletGate>
  );
}