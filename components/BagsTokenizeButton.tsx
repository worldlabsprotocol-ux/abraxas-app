// FILE: components/BagsTokenizeButton.tsx
// Frontend component for Bags.fm business revenue tokenization.
// Shows loading state, success with certificate link, and error handling.
// Add this to PortfolioTab studio grid or IssuanceEngine asset class list.
"use client";

import { useState }  from "react";
import { useWallet } from "@solana/wallet-adapter-react";

const MONO = "'JetBrains Mono',monospace";

interface BagsResult {
  assetId:     string;
  certId:      string;
  revenue:     number;
  bagsId:      string;
  metadataUri?: string;
}

export function BagsTokenizeButton() {
  const { publicKey, connected }  = useWallet();
  const [businessName, setBusinessName] = useState("");
  const [revenue,      setRevenue]      = useState("");
  const [loading,      setLoading]      = useState(false);
  const [result,       setResult]       = useState<BagsResult | null>(null);
  const [error,        setError]        = useState("");

  async function handleTokenize() {
    if (!connected || !publicKey || !businessName || !revenue) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/bags/tokenize", {
        method:  "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          cliArgs:       ["--revenue", revenue, "--name", businessName.replace(/\s+/g,"-").toLowerCase()],
          businessName,
          walletAddress: publicKey.toBase58(),
          category:      "Business Revenue",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tokenization failed");
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (!connected) return null;

  if (result) return (
    <div style={{
      padding:"1.25rem", borderRadius:"8px",
      border:"1px solid rgba(20,241,149,0.25)",
      background:"rgba(20,241,149,0.04)",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                    marginBottom:"0.875rem" }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"#14F195" }}/>
        <span style={{ fontSize:"0.62rem", fontWeight:800,
                       color:"#14F195", fontFamily:MONO }}>
          Revenue Tokenized
        </span>
      </div>
      {([
        ["Business",     result.bagsId],
        ["Revenue",      `$${result.revenue.toLocaleString()}`],
        ["Asset ID",     result.assetId.slice(0,16)+"…"],
        ["Certificate",  result.certId],
      ] as [string,string][]).map(([k,v]) => (
        <div key={k} style={{ display:"flex", justifyContent:"space-between",
                              padding:"0.3rem 0",
                              borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
          <span style={{ fontSize:"0.42rem", color:"rgba(255,255,255,0.3)",
                         fontFamily:MONO, textTransform:"uppercase",
                         letterSpacing:"0.1em" }}>{k}</span>
          <span style={{ fontSize:"0.46rem", fontWeight:600,
                         color:"rgba(255,255,255,0.6)", fontFamily:MONO }}>{v}</span>
        </div>
      ))}
      <a href={`/api/certificates/${result.certId}/verify`}
        target="_blank" rel="noopener noreferrer"
        style={{ display:"block", marginTop:"0.75rem", padding:"0.5rem",
                 borderRadius:"5px", textAlign:"center", textDecoration:"none",
                 border:"1px solid rgba(20,241,149,0.2)",
                 background:"rgba(20,241,149,0.07)",
                 fontSize:"0.48rem", fontWeight:700,
                 color:"#14F195", fontFamily:MONO }}>
        View Verification Certificate →
      </a>
      <button onClick={() => { setResult(null); setBusinessName(""); setRevenue(""); }}
        style={{ width:"100%", marginTop:"0.4rem", padding:"0.4rem",
                 background:"none", border:"1px solid rgba(255,255,255,0.07)",
                 borderRadius:"5px", color:"rgba(255,255,255,0.3)",
                 fontSize:"0.44rem", cursor:"pointer", fontFamily:MONO }}>
        Tokenize another
      </button>
    </div>
  );

  return (
    <div style={{
      padding:"1.25rem", borderRadius:"8px",
      border:"1px solid rgba(20,241,149,0.15)",
      background:"rgba(20,241,149,0.03)",
    }}>
      <div style={{ fontSize:"0.44rem", fontWeight:700,
                    color:"rgba(20,241,149,0.5)", fontFamily:MONO,
                    textTransform:"uppercase", letterSpacing:"0.15em",
                    marginBottom:"0.75rem" }}>
        Bags.fm Business Revenue
      </div>
      <p style={{ fontSize:"0.54rem", color:"rgba(255,255,255,0.35)",
                  lineHeight:1.65, marginBottom:"1rem" }}>
        Tokenize a recurring SaaS or subscription revenue stream as a
        verified on-chain collateral position.
      </p>

      <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem",
                    marginBottom:"0.875rem" }}>
        <input
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          placeholder="Business name"
          style={{
            padding:"0.625rem 0.875rem", borderRadius:"5px",
            border:"1px solid rgba(255,255,255,0.1)",
            background:"rgba(255,255,255,0.03)",
            color:"#f0f0f0", fontSize:"0.6rem", fontFamily:MONO,
            outline:"none",
          }}
        />
        <input
          value={revenue}
          onChange={e => setRevenue(e.target.value.replace(/[^0-9.]/g,""))}
          placeholder="Annual revenue ($)"
          style={{
            padding:"0.625rem 0.875rem", borderRadius:"5px",
            border:"1px solid rgba(255,255,255,0.1)",
            background:"rgba(255,255,255,0.03)",
            color:"#f0f0f0", fontSize:"0.6rem", fontFamily:MONO,
            outline:"none",
          }}
        />
      </div>

      {error && (
        <div style={{ padding:"0.5rem 0.75rem", borderRadius:"4px",
                      background:"rgba(242,107,107,0.08)",
                      border:"1px solid rgba(242,107,107,0.2)",
                      fontSize:"0.48rem", color:"#f26b6b", fontFamily:MONO,
                      marginBottom:"0.625rem" }}>
          {error}
        </div>
      )}

      <button
        onClick={handleTokenize}
        disabled={loading || !businessName || !revenue}
        style={{
          width:"100%", padding:"0.75rem", borderRadius:"6px",
          fontWeight:800, fontSize:"0.62rem", fontFamily:MONO,
          letterSpacing:"0.04em", cursor: loading ? "wait" : "pointer",
          border:"none",
          background: loading || !businessName || !revenue
            ? "rgba(255,255,255,0.05)"
            : "linear-gradient(135deg,#14F195,#0fa870)",
          color: loading || !businessName || !revenue
            ? "rgba(255,255,255,0.2)" : "#060810",
          transition:"all 0.15s",
        }}>
        {loading ? "Submitting to Bags.fm…" : "Tokenize Business Revenue"}
      </button>
    </div>
  );
}