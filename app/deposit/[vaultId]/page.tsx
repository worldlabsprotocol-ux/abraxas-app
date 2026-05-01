"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authState";
import { usePortfolioData, VAULT_YIELD_RATES } from "@/lib/usePortfolioData";
import { mockVaults, mockAgents } from "@/lib/mockData";
import { Button } from "@/components/Button";
import { WalletGate } from "@/components/WalletGate";
import { VaultExplainer } from "@/components/VaultExplainer";
import { formatCurrency } from "@/lib/utils";

type Step = "input" | "preview" | "minting" | "done";

interface MintResult {
  mintAddress:  string;
  tokenAccount: string;
  txSignature:  string | null;
  explorerUrl:  string | null;
  tokenName?:   string;
  tokenSymbol?: string;
  demo?:        boolean;
}

// Step-by-step minting progress — no hidden steps, no ambiguity
interface MintProgress {
  submitting: boolean;
  submitted:  boolean;
  minting:    boolean;
  minted:     boolean;
  error:      string | null;
}

function DepositContent({ params }: { params: { vaultId: string } }) {
  const { vaultId } = params;
  const router  = useRouter();
  const { walletAddress, walletAddressFull } = useAuth();
  const portfolio = usePortfolioData();

  const vault  = mockVaults.find((v) => v.id === vaultId);
  const agent  = mockAgents.find((a) => a.id === vault?.agentId);
  const rate   = VAULT_YIELD_RATES[vaultId] ?? 9.0;

  const [step,     setStep]    = useState<Step>("input");
  const [amount,   setAmount]  = useState("");
  const [agreed,   setAgreed]  = useState(false);
  const [result,   setResult]  = useState<MintResult | null>(null);
  const [progress, setProgress]= useState<MintProgress>({
    submitting: false, submitted: false,
    minting: false, minted: false, error: null,
  });

  const usd     = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
  const annual  = usd > 0 ? Math.round(usd * rate / 100) : 0;
  const monthly = Math.round(annual / 12);

  const confirm = async () => {
    if (!walletAddressFull || !vault) return;
    setStep("minting");

    // Step 1 — submitting transaction
    setProgress({ submitting: true, submitted: false, minting: false, minted: false, error: null });

    await new Promise((r) => setTimeout(r, 600)); // let UI update

    setProgress((p) => ({ ...p, submitted: true, minting: true }));

    try {
      const res  = await fetch("/api/mint/position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet: walletAddressFull,
          vaultId, vaultName: vault.name,
          yieldRate: rate, depositedUsd: usd,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        setProgress((p) => ({ ...p, error: data.error ?? "Mint failed" }));
        setStep("preview");
        return;
      }

      setProgress((p) => ({ ...p, minting: false, minted: true }));
      await new Promise((r) => setTimeout(r, 400));

      setResult({
        mintAddress:  data.mintAddress,
        tokenAccount: data.tokenAccount,
        txSignature:  data.txSignature,
        explorerUrl:  data.explorerUrl,
        tokenName:    data.tokenName,
        tokenSymbol:  data.tokenSymbol,
        demo:         data.demo,
      });
      setStep("done");

    } catch {
      setProgress((p) => ({ ...p, error: "Network error — please try again." }));
      setStep("preview");
    }
  };

  if (!vault) return (
    <div style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
      <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Vault not found.</p>
      <Button onClick={() => router.push("/marketplace")}>Browse Vaults</Button>
    </div>
  );

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2rem 1rem", width: "100%", boxSizing: "border-box" }}>

      {step !== "done" && (
        <button onClick={() => step === "input" ? router.back() : setStep("input")}
          style={{ fontSize: "0.75rem", color: "var(--subtle)", background: "none", border: "none", cursor: "pointer", marginBottom: "1.5rem" }}>
          ← {step === "input" ? "Back" : "Edit amount"}
        </button>
      )}

      {/* Vault chip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.875rem 1.25rem", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{vault.name}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--subtle)", marginTop: "0.15rem" }}>{vault.assetClass} · {agent?.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--green)" }}>{rate}%</div>
          <div style={{ fontSize: "0.6rem", color: "var(--subtle)", textTransform: "uppercase" }}>APY</div>
        </div>
      </div>

      {/* ── INPUT ── */}
      {step === "input" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: "1.1rem", fontWeight: 300 }}>$</span>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
              style={{ paddingLeft: "2rem", fontSize: "1.5rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, textAlign: "center" }} />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            {["500","1000","5000","10000"].map((v) => (
              <button key={v} onClick={() => setAmount(v)} style={{ background: amount === v ? "rgba(200,169,110,0.12)" : "var(--surface)", border: `1px solid ${amount === v ? "var(--gold)" : "var(--line)"}`, color: amount === v ? "var(--gold)" : "var(--muted)", borderRadius: "6px", padding: "0.3rem 0.65rem", fontSize: "0.72rem", cursor: "pointer" }}>
                ${parseInt(v).toLocaleString()}
              </button>
            ))}
          </div>

          {usd > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", background: "rgba(61,214,140,0.05)", border: "1px solid rgba(61,214,140,0.18)", borderRadius: "10px", padding: "1rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--green)" }}>{formatCurrency(annual)}</div>
                <div style={{ fontSize: "0.62rem", color: "var(--subtle)" }}>per year</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--green)" }}>{formatCurrency(monthly)}</div>
                <div style={{ fontSize: "0.62rem", color: "var(--subtle)" }}>per month</div>
              </div>
            </div>
          )}

          <Button size="lg" fullWidth disabled={usd <= 0} onClick={() => setStep("preview")}>
            Continue
          </Button>

          <div style={{ marginTop: "0.5rem" }}>
            <VaultExplainer />
          </div>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {step === "preview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
            {[
              { label: "Depositing",   value: formatCurrency(usd),             bold: true  },
              { label: "APY",          value: `${rate}%`,                      green: true },
              { label: "Yield / year", value: formatCurrency(annual),          green: true },
              { label: "Agent",        value: agent?.name ?? "AGENT-001",      mono: true  },
              { label: "Standard",     value: "Token-2022 · Solana"                        },
              { label: "Token name",   value: `ABRAXAS ${vault.assetClass.toUpperCase().split(" ")[0]} POSITION` },
              { label: "Custody",      value: "Non-custodial"                              },
            ].map(({ label, value, bold, green, mono }, i, arr) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1.25rem", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--subtle)" }}>{label}</span>
                <span style={{ fontSize: mono ? "0.7rem" : "0.8rem", fontWeight: bold ? 700 : 500, color: green ? "var(--green)" : "var(--text)", fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* What happens next — no hidden steps */}
          <div style={{ background: "rgba(200,169,110,0.04)", border: "1px solid rgba(200,169,110,0.15)", borderRadius: "10px", padding: "0.875rem 1.25rem" }}>
            <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "0.5rem" }}>What happens when you confirm</p>
            {[
              "Transaction submitted to Solana",
              "Token-2022 position minted to your wallet",
              "Agent activates on your vault",
              "Token appears in Phantom / Solflare as ABRAP",
              "Solscan link provided immediately",
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start", marginBottom: "0.3rem" }}>
                <span style={{ fontSize: "0.6rem", color: "var(--gold)", marginTop: "2px", flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{s}</span>
              </div>
            ))}
          </div>

          {progress.error && (
            <div style={{ padding: "0.75rem 1rem", background: "rgba(242,107,107,0.06)", border: "1px solid rgba(242,107,107,0.2)", borderRadius: "8px" }}>
              <p style={{ fontSize: "0.75rem", color: "#f26b6b", margin: 0 }}>{progress.error}</p>
            </div>
          )}

          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", cursor: "pointer", padding: "0.875rem 1rem", background: "rgba(200,169,110,0.04)", borderRadius: "8px", border: "1px solid rgba(200,169,110,0.15)", width: "100%", boxSizing: "border-box" }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.6, wordBreak: "break-word" }}>
              Beta · Non-custodial · Token-2022 minted to my wallet · Yields are estimates · I retain full ownership
            </span>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.625rem" }}>
            <Button size="lg" variant="ghost" onClick={() => setStep("input")}>Edit</Button>
            <Button size="lg" fullWidth disabled={!agreed} onClick={confirm}>Confirm Deposit</Button>
          </div>
        </div>
      )}

      {/* ── MINTING — step by step, no ambiguity ── */}
      {step === "minting" && (
        <div style={{ padding: "2rem 0" }}>
          <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "1.75rem", textAlign: "center" }}>Processing deposit…</p>

          {[
            { key: "submitting", label: "Submitting transaction to Solana",    done: progress.submitted },
            { key: "minting",    label: "Minting Token-2022 position",         done: progress.minted   },
            { key: "activating", label: "Activating agent on vault",           done: progress.minted   },
          ].map((s, i) => {
            const active = i === 0 ? progress.submitting && !progress.submitted
                         : i === 1 ? progress.submitted && !progress.minted
                         : false;
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.875rem 1.25rem", background: s.done ? "rgba(61,214,140,0.06)" : active ? "rgba(200,169,110,0.06)" : "var(--surface)", border: `1px solid ${s.done ? "rgba(61,214,140,0.2)" : active ? "rgba(200,169,110,0.2)" : "var(--line)"}`, borderRadius: "10px", marginBottom: "0.625rem", transition: "all 0.3s" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: s.done ? "var(--green)" : active ? "var(--gold)" : "var(--surface)", border: `2px solid ${s.done ? "var(--green)" : active ? "var(--gold)" : "var(--line)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.3s" }}>
                  {s.done && <span style={{ color: "var(--void)", fontSize: "0.65rem", fontWeight: 700 }}>✓</span>}
                  {active && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--gold)", animation: "pulse 1s ease-in-out infinite" }} />}
                </div>
                <span style={{ fontSize: "0.82rem", color: s.done ? "var(--green)" : active ? "var(--text)" : "var(--subtle)", fontWeight: s.done || active ? 600 : 400 }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── DONE ── */}
      {step === "done" && result && (
        <div style={{ maxWidth: "460px", margin: "0 auto", textAlign: "center", padding: "1rem 0" }}>
          <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(61,214,140,0.12)", border: "2px solid var(--green)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", fontSize: "1.5rem" }}>
            ✓
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.4rem", marginBottom: "0.5rem" }}>
            Position activated.
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
            {formatCurrency(usd)} into {vault.name}.<br />
            {agent?.name} is now operating your position.
          </p>

          {/* Token in wallet — the most important thing to show */}
          <div style={{ background: "rgba(61,214,140,0.06)", border: "1px solid rgba(61,214,140,0.25)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
              <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--green)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {result.demo ? "Position Token · Demo" : "Token in your wallet"}
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.25rem" }}>
              {result.tokenName ?? `ABRAXAS POSITION`}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "var(--muted)", marginBottom: "0.875rem" }}>
              Symbol: {result.tokenSymbol ?? "ABRAP"} · Token-2022 · Solana
            </div>

            {result.demo ? (
              <p style={{ fontSize: "0.7rem", color: "var(--subtle)", lineHeight: 1.55 }}>
                Add VAULT_AUTHORITY_SECRET to Vercel to enable live on-chain minting. The token will appear in Phantom / Solflare automatically once live.
              </p>
            ) : (
              <>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.62rem", color: "var(--gold)", wordBreak: "break-all", marginBottom: "0.75rem", background: "rgba(200,169,110,0.06)", padding: "0.5rem 0.75rem", borderRadius: "6px" }}>
                  {result.mintAddress}
                </div>
                <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
                  {result.explorerUrl && (
                    <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}>
                      View tx on Solscan ↗
                    </a>
                  )}
                  <a href={`https://solscan.io/token/${result.mintAddress}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    View token ↗
                  </a>
                </div>
              </>
            )}
          </div>

          {/* How to see it in wallet */}
          {!result.demo && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.875rem 1.25rem", marginBottom: "1.25rem", textAlign: "left" }}>
              <p style={{ fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>See it in your wallet</p>
              <p style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.6 }}>
                Open Phantom → NFTs tab → your position appears as <strong style={{ color: "var(--text)" }}>{result.tokenSymbol ?? "ABRAP"}</strong>.
                In Solflare, check the Tokens section. The token name and image are embedded in the Token-2022 metadata.
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center" }}>
            <Button size="lg" onClick={() => router.push("/operator")}>My Profile</Button>
            <Button size="lg" variant="ghost" onClick={() => router.push(`/vault/${vaultId}`)}>View Vault</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DepositPage({ params }: { params: { vaultId: string } }) {
  return <WalletGate><DepositContent params={params} /></WalletGate>;
}