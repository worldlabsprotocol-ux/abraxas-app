// FILE: app/page.tsx
// Protection-first homepage.
// User flow: land → see unprotected assets → click Protect → policy armed → see outcome.
// 30-second actionable loop. No dashboards. No portfolio tracking.
"use client";

import { useState } from "react";
import { NFT_COLLECTIONS, ASSET_TYPES } from "@/lib/appData";
import { useCircuitState, useProtocolStream } from "@/lib/protocolStream";
import { useProtectionStore, protectAsset, triggerProtection, ProtectedAsset } from "@/lib/protectionStore";

// ─── System state badge ───────────────────────────────────────────────────────
function SystemStateBadge() {
  const { state }  = useCircuitState();
  const { protectedCount, triggeredCount, assets } = useProtectionStore();
  const total = assets.length;

  const systemState = triggeredCount > 0 ? "AT RISK" : total === 0 ? "EXPOSED" : "PROTECTED";
  const SC = {
    "PROTECTED": { color: "var(--green)", bg: "rgba(61,214,140,0.08)",  border: "rgba(61,214,140,0.2)"  },
    "AT RISK":   { color: "#f26b6b",      bg: "rgba(242,107,107,0.08)", border: "rgba(242,107,107,0.25)" },
    "EXPOSED":   { color: "#FBBF24",      bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)"  },
  }[systemState];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0.875rem", borderRadius: "8px", background: SC.bg, border: `1px solid ${SC.border}` }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: SC.color, animation: systemState !== "PROTECTED" ? "pulse 1s ease-in-out infinite" : "none" }} />
      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: SC.color, letterSpacing: "0.1em" }}>
        {systemState}
      </span>
      {total > 0 && (
        <span style={{ fontSize: "0.62rem", color: SC.color, opacity: 0.7 }}>
          · {protectedCount}/{total} assets
        </span>
      )}
    </div>
  );
}

// ─── Action log ───────────────────────────────────────────────────────────────
function ActionLog({ assets }: { assets: ProtectedAsset[] }) {
  const events = assets
    .filter((a) => a.lastEvent)
    .sort((a, b) => (b.lastEvent?.ts ?? 0) - (a.lastEvent?.ts ?? 0))
    .slice(0, 5);

  if (events.length === 0) return null;

  const TYPE_COLOR: Record<string, string> = {
    policy_armed:    "var(--green)",
    risk_detected:   "#FBBF24",
    action_triggered:"#f26b6b",
    status_changed:  "var(--subtle)",
  };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden", marginBottom: "1.25rem" }}>
      <div style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 1.5s ease-in-out infinite" }} />
        <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Action Log</span>
        <span style={{ marginLeft: "auto", fontSize: "0.58rem", color: "var(--subtle)", padding: "0.1rem 0.4rem", borderRadius: "3px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)" }}>
          Simulation Mode — no funds moved
        </span>
      </div>
      {events.map((a) => {
        const e   = a.lastEvent!;
        const ago = Math.max(1, Math.floor((Date.now() - e.ts) / 1000));
        return (
          <div key={a.id} style={{ display: "grid", gridTemplateColumns: "8px 1fr auto", gap: "0.625rem", alignItems: "flex-start", padding: "0.55rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ display: "block", width: "6px", height: "6px", borderRadius: "50%", background: TYPE_COLOR[e.type] ?? "var(--subtle)", marginTop: "4px" }} />
            <div>
              <span style={{ fontSize: "0.62rem", color: "var(--gold)", marginRight: "0.4rem", fontFamily: "'JetBrains Mono',monospace" }}>{a.name}</span>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{e.message}</span>
            </div>
            <span style={{ fontSize: "0.58rem", color: "var(--subtle)", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>{ago}s</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Protected asset card ─────────────────────────────────────────────────────
function ProtectedAssetCard({ asset }: { asset: ProtectedAsset }) {
  const [triggering, setTriggering] = useState(false);
  const s = asset.status;

  const SC = {
    protected: { color: "var(--green)", border: "rgba(61,214,140,0.2)",  bg: "rgba(61,214,140,0.05)"  },
    triggered: { color: "#f26b6b",      border: "rgba(242,107,107,0.25)", bg: "rgba(242,107,107,0.06)" },
    unprotected:{ color: "#FBBF24",     border: "rgba(251,191,36,0.2)",   bg: "rgba(251,191,36,0.04)"  },
  }[s];

  const handleTrigger = async () => {
    setTriggering(true);
    await new Promise((r) => setTimeout(r, 600));
    triggerProtection(asset.id);
    setTriggering(false);
  };

  return (
    <div style={{ background: SC.bg, border: `1px solid ${SC.border}`, borderRadius: "12px", padding: "0.875rem 1rem", transition: "all 0.3s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.15rem" }}>{asset.name}</div>
          <div style={{ fontSize: "0.65rem", color: "var(--subtle)" }}>{asset.assetType}{asset.floor ? ` · ${asset.floor}` : ""}</div>
        </div>
        <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px", background: `${SC.color}18`, color: SC.color, border: `1px solid ${SC.color}30`, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {s === "protected" ? "Protected" : s === "triggered" ? "Triggered" : "Unprotected"}
        </span>
      </div>
      {asset.policy && (
        <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
          Policy: {asset.policy}
        </div>
      )}
      {asset.lastEvent && (
        <div style={{ fontSize: "0.65rem", color: s === "triggered" ? "#f26b6b" : "var(--subtle)", marginBottom: "0.5rem" }}>
          {asset.lastEvent.message}
        </div>
      )}
      {s === "protected" && (
        <button onClick={handleTrigger} disabled={triggering} style={{ fontSize: "0.65rem", color: "var(--subtle)", background: "none", border: "1px solid var(--line)", borderRadius: "5px", padding: "0.2rem 0.6rem", cursor: "pointer" }}>
          {triggering ? "Simulating…" : "Simulate risk event →"}
        </button>
      )}
    </div>
  );
}

// ─── Risk feed ────────────────────────────────────────────────────────────────
function RiskFeed({ onProtect }: { onProtect: (name: string, type: string, floor?: string) => void }) {
  const events = useProtocolStream(8);
  const { assets } = useProtectionStore();
  const alreadyProtected = new Set(assets.map((a) => a.name));

  // Merge NFT collections with live protocol events for context
  const feedItems = NFT_COLLECTIONS.slice(0, 6).map((c, i) => {
    const riskLevel: "low" | "medium" | "high" = !c.positive ? "high" : c.change.startsWith("+") && parseFloat(c.change) > 10 ? "medium" : "low";
    const event = events[i % events.length];
    return {
      name:      c.name,
      assetType: c.chain === "SOL" ? "Solana NFT" : "Ethereum NFT",
      floor:     c.floor,
      change:    c.change,
      positive:  c.positive,
      riskLevel,
      signal:    c.signal,
      detectedEvent: !c.positive || riskLevel !== "low" ? (event?.message ?? c.signal) : null,
      protected: alreadyProtected.has(c.name),
    };
  });

  const RISK_COLOR = { low: "var(--green)", medium: "#FBBF24", high: "#f26b6b" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {feedItems.map((item) => (
        <div key={item.name} style={{ background: "var(--surface)", border: `1px solid ${item.riskLevel === "high" ? "rgba(242,107,107,0.2)" : item.riskLevel === "medium" ? "rgba(251,191,36,0.15)" : "var(--line)"}`, borderRadius: "10px", padding: "0.75rem 0.875rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>{item.name}</span>
                <span style={{ fontSize: "0.58rem", fontWeight: 700, padding: "0.06rem 0.35rem", borderRadius: "3px", background: `${RISK_COLOR[item.riskLevel]}14`, color: RISK_COLOR[item.riskLevel], border: `1px solid ${RISK_COLOR[item.riskLevel]}30`, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {item.riskLevel === "high" ? "HIGH RISK" : item.riskLevel === "medium" ? "WATCH" : "LOW RISK"}
                </span>
                {item.protected && (
                  <span style={{ fontSize: "0.58rem", padding: "0.06rem 0.35rem", borderRadius: "3px", background: "rgba(61,214,140,0.1)", color: "var(--green)", border: "1px solid rgba(61,214,140,0.2)" }}>
                    ✓ Protected
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: item.detectedEvent ? "0.25rem" : 0 }}>
                {item.floor} · <span style={{ color: item.positive ? "var(--green)" : "#f26b6b" }}>{item.change}</span> · {item.assetType}
              </div>
              {item.detectedEvent && !item.protected && (
                <div style={{ fontSize: "0.65rem", color: item.riskLevel === "high" ? "#f26b6b" : "#FBBF24" }}>
                  ⚠ {item.signal}
                </div>
              )}
              {!item.protected && item.riskLevel !== "low" && (
                <div style={{ fontSize: "0.62rem", color: "var(--subtle)", marginTop: "0.2rem" }}>
                  This asset is unprotected · No active policy · If risk occurs, no action will be taken.
                </div>
              )}
            </div>
            {!item.protected ? (
              <button
                onClick={() => onProtect(item.name, item.assetType, item.floor)}
                style={{ flexShrink: 0, background: item.riskLevel !== "low" ? "var(--gold)" : "var(--surface)", color: item.riskLevel !== "low" ? "var(--void)" : "var(--muted)", border: `1px solid ${item.riskLevel !== "low" ? "var(--gold)" : "var(--line)"}`, borderRadius: "7px", padding: "0.4rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                Protect →
              </button>
            ) : (
              <span style={{ flexShrink: 0, fontSize: "0.65rem", color: "var(--green)" }}>Active</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Protect modal ────────────────────────────────────────────────────────────
function ProtectModal({ name, assetType, floor, onConfirm, onCancel }: {
  name: string; assetType: string; floor?: string;
  onConfirm: (policy: string) => void; onCancel: () => void;
}) {
  const [selected, setSelected] = useState("Quick Protect (Recommended)");
  const POLICIES = [
    { id: "Quick Protect (Recommended)", label: "Quick Protect", desc: "Alert + simulated freeze on anomaly. Zero config." },
    { id: "Alert Only",                   label: "Alert Only",    desc: "Notify on risk. No action taken automatically." },
    { id: "Aggressive Freeze",            label: "Aggressive",    desc: "Freeze position on any deviation > 5%." },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} />
      <div style={{ position: "relative", background: "var(--surface)", border: "1px solid rgba(200,169,110,0.3)", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: "420px", zIndex: 1 }}>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.1rem", marginBottom: "0.3rem" }}>
          Protect this asset
        </h2>
        <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "1.25rem" }}>
          {name} · {assetType}{floor ? ` · ${floor}` : ""}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {POLICIES.map((p) => (
            <button key={p.id} onClick={() => setSelected(p.id)} style={{ textAlign: "left", background: selected === p.id ? "rgba(200,169,110,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${selected === p.id ? "var(--gold)" : "var(--line)"}`, borderRadius: "8px", padding: "0.75rem 0.875rem", cursor: "pointer" }}>
              <div style={{ fontWeight: 700, fontSize: "0.78rem", color: selected === p.id ? "var(--gold)" : "var(--text)", marginBottom: "0.15rem" }}>{p.label}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--subtle)" }}>{p.desc}</div>
            </button>
          ))}
        </div>
        <div style={{ padding: "0.625rem 0.875rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)", borderRadius: "8px", marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.62rem", color: "var(--subtle)" }}>
            <strong style={{ color: "var(--gold)" }}>Simulation Mode</strong> — no funds moved. Policy is logged and auditable. Triggers are deterministic.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={onCancel} style={{ flex: 1, background: "none", border: "1px solid var(--line)", borderRadius: "8px", padding: "0.65rem", color: "var(--muted)", fontSize: "0.78rem", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(selected)} style={{ flex: 2, background: "var(--gold)", border: "none", borderRadius: "8px", padding: "0.65rem", color: "var(--void)", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif" }}>
            Enable Protection →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Homepage ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const store = useProtectionStore();
  const [modal, setModal] = useState<{ name: string; assetType: string; floor?: string } | null>(null);
  const [justProtected, setJustProtected] = useState<string | null>(null);

  const handleProtect = (name: string, assetType: string, floor?: string) => {
    setModal({ name, assetType, floor });
  };

  const handleConfirm = (policy: string) => {
    if (!modal) return;
    const asset = protectAsset({ ...modal, policy });
    setJustProtected(asset.name);
    setModal(null);
    setTimeout(() => setJustProtected(null), 3000);
  };

  const hasAssets = store.assets.length > 0;

  return (
    <div style={{ background: "var(--void)", minHeight: "100vh" }}>
      {modal && <ProtectModal {...modal} onConfirm={handleConfirm} onCancel={() => setModal(null)} />}

      {/* ── Header ── */}
      <section style={{ maxWidth: "960px", margin: "0 auto", padding: "1.5rem 1.25rem 0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.3rem,3.5vw,1.75rem)", letterSpacing: "-0.02em", margin: 0, marginBottom: "0.25rem" }}>
              Protect your assets.
            </h1>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>
              Risk is detected. Policy is armed. Action is automatic.
            </p>
          </div>
          <SystemStateBadge />
        </div>
      </section>

      {/* ── Main content ── */}
      <section style={{ maxWidth: "960px", margin: "0 auto", padding: "0 1.25rem 2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,360px),1fr))", gap: "1.25rem", alignItems: "flex-start" }}>

          {/* Left column: risk feed */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
              <span style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--subtle)" }}>
                Assets at risk
              </span>
              <span style={{ fontSize: "0.6rem", color: "var(--gold)" }}>Simulation Mode</span>
            </div>
            <RiskFeed onProtect={handleProtect} />
          </div>

          {/* Right column: protected assets + action log */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Success flash */}
            {justProtected && (
              <div style={{ padding: "0.875rem 1rem", background: "rgba(61,214,140,0.1)", border: "1px solid rgba(61,214,140,0.3)", borderRadius: "10px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--green)" }} />
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--green)" }}>
                  Protection Enabled — {justProtected}
                </span>
              </div>
            )}

            {/* Protected assets */}
            {hasAssets ? (
              <div>
                <p style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--subtle)", marginBottom: "0.625rem" }}>
                  Protected assets
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                  {store.assets.map((a) => <ProtectedAssetCard key={a.id} asset={a} />)}
                </div>
              </div>
            ) : (
              <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "12px", padding: "1.5rem", textAlign: "center" }}>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.4rem" }}>No protected assets</p>
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0", lineHeight: 1.5 }}>
                  If a risk event occurs, no action will be taken.<br />
                  Protect an asset from the feed to arm a policy.
                </p>
              </div>
            )}

            {/* Action log */}
            <ActionLog assets={store.assets} />
          </div>
        </div>
      </section>
    </div>
  );
}