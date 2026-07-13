"use client";
// FILE: components/redesign/ProductLoopStepVisual.tsx
// Step-specific visuals — distinct photo overlays and diagram modes per step.

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const BLUE = "#4285F4";
const RED = "#F87171";
const AMBER = "#F59E0B";

function PanelShell({ children, align = "center" }: { children: React.ReactNode; align?: "center" | "stretch" }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: align === "stretch" ? "stretch" : "center",
      justifyContent: "center",
      padding: "2.5rem 1.25rem 1.5rem",
      pointerEvents: "none",
    }}>
      {children}
    </div>
  );
}

function Card({ children, width = 280, accent = ACCENT }: { children: React.ReactNode; width?: number; accent?: string }) {
  return (
    <div style={{
      width: "100%", maxWidth: width, borderRadius: 16,
      background: "rgba(10,14,20,0.94)",
      border: `1px solid ${accent}33`,
      boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
      backdropFilter: "blur(14px)",
      overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

function FlowNode({ label, sub, color }: { label: string; sub?: string; color: string }) {
  return (
    <div style={{
      padding: "0.5rem 0.65rem", borderRadius: 10,
      background: `${color}18`, border: `1px solid ${color}44`,
      textAlign: "center", minWidth: 72,
    }}>
      <div style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 800, color }}>{label}</div>
      {sub && <div style={{ fontFamily: MONO, fontSize: "0.48rem", color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function FlowArrow() {
  return (
    <span style={{ fontFamily: MONO, fontSize: "0.85rem", color: "rgba(255,255,255,0.35)", padding: "0 0.15rem" }}>→</span>
  );
}

/** Email re-verify spam — the pain before Abraxas */
function EmailSpamDiagram() {
  const emails = [
    { from: "Buyer · Singapore", subject: "Please re-send survey plat Lot 4", urgent: true },
    { from: "Lender · Dallas", subject: "Need Phase I again — wrong version", urgent: true },
    { from: "Buyer · Singapore", subject: "Following up — documents?", urgent: false },
    { from: "Counsel · NYC", subject: "Warranty deed PDF expired link", urgent: false },
    { from: "Buyer · Singapore", subject: "URGENT: due diligence today", urgent: true },
  ];
  return (
    <PanelShell align="stretch">
      <Card width={320} accent={RED}>
        <div style={{ padding: "0.65rem 0.85rem", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: "#fff" }}>Inbox</span>
          <span style={{ fontFamily: MONO, fontSize: "0.55rem", color: RED, fontWeight: 700 }}>47 unread</span>
        </div>
        <div style={{ maxHeight: 200, overflow: "hidden" }}>
          {emails.map((e, i) => (
            <div key={i} style={{
              padding: "0.55rem 0.85rem", borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: e.urgent ? "rgba(248,113,113,0.08)" : "transparent",
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.58rem", color: "rgba(255,255,255,0.45)" }}>{e.from}</div>
              <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: e.urgent ? 700 : 500, color: e.urgent ? RED : "#fff" }}>
                {e.subject}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "0.5rem 0.85rem", fontFamily: FONT, fontSize: "0.58rem", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
          Same PDFs · every client · every time
        </div>
      </Card>
    </PanelShell>
  );
}

function PainMomentDiagram() {
  return (
    <PanelShell>
      <Card width={300} accent={AMBER}>
        <div style={{ padding: "1.25rem 1rem", textAlign: "center" }}>
          <div style={{ fontFamily: FONT, fontSize: "2rem", marginBottom: "0.35rem" }}>⚠</div>
          <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 900, color: AMBER, marginBottom: "0.45rem" }}>
            We need a solution
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
            Important diligence lost in email threads. Global buyers waiting. Trust stalling before $1.6M closes.
          </div>
        </div>
      </Card>
    </PanelShell>
  );
}

function VerifyOnceDiagram() {
  return (
    <PanelShell align="stretch">
      <div style={{ width: "100%", maxWidth: 340, alignSelf: "center" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap",
          gap: "0.35rem", marginBottom: "0.85rem",
        }}>
          <FlowNode label="Google" sub="OAuth" color={BLUE} />
          <FlowArrow />
          <FlowNode label="zkLogin" sub="Sui" color={ACCENT} />
          <FlowArrow />
          <FlowNode label="Passport" sub="ready" color={ACCENT} />
        </div>
        <Card width={300} accent={BLUE}>
          <div style={{ padding: "1.1rem 1rem", textAlign: "center" }}>
            <ImageMark />
            <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: "#fff", margin: "0.65rem 0 0.35rem" }}>
              Verify once on Abraxas
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
              11 plats · Phase I · title — on-registry, not in email
            </div>
          </div>
        </Card>
      </div>
    </PanelShell>
  );
}

function GlobalShareDiagram() {
  const buyers = [
    { label: "SG fund", color: "#38BDF8" },
    { label: "US lender", color: ACCENT },
    { label: "EU family", color: AMBER },
    { label: "OK local", color: BLUE },
  ];
  return (
    <PanelShell align="stretch">
      <div style={{ width: "100%", maxWidth: 340, alignSelf: "center" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap",
          gap: "0.35rem", marginBottom: "0.85rem",
        }}>
          <FlowNode label="Profile" sub="Passport" color={ACCENT} />
          <FlowArrow />
          <FlowNode label="Proof" sub="ABX record" color={BLUE} />
          <FlowArrow />
          <FlowNode label="Buyers" sub="global" color="#38BDF8" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
          {buyers.map(b => (
            <div key={b.label} style={{
              padding: "0.55rem", borderRadius: 10, textAlign: "center",
              background: `${b.color}12`, border: `1px solid ${b.color}33`,
              fontFamily: FONT, fontSize: "0.65rem", fontWeight: 700, color: b.color,
            }}>
              {b.label} ✓
            </div>
          ))}
        </div>
        <div style={{
          marginTop: "0.55rem", padding: "0.5rem", borderRadius: 8, textAlign: "center",
          fontFamily: FONT, fontSize: "0.58rem", color: "rgba(255,255,255,0.55)",
        }}>
          One upload · permissioned share · no re-forward
        </div>
      </div>
    </PanelShell>
  );
}

function SettleClosedLoopDiagram() {
  return (
    <PanelShell>
      <Card width={310} accent={ACCENT}>
        <div style={{ padding: "1rem", textAlign: "center" }}>
          <div style={{ fontFamily: FONT, fontSize: "1.5rem", fontWeight: 900, color: ACCENT, marginBottom: "0.25rem" }}>
            $1,639,000
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "#fff", marginBottom: "0.35rem" }}>
            Grady County 270 · USDC on Sui
          </div>
          <div style={{
            display: "flex", justifyContent: "center", gap: "0.35rem", flexWrap: "wrap",
            marginBottom: "0.75rem",
          }}>
            <FlowNode label="Inquire" sub="Abraxas" color={ACCENT} />
            <FlowArrow />
            <FlowNode label="Verify" sub="once" color={BLUE} />
            <FlowArrow />
            <FlowNode label="Settle" sub="closed" color={ACCENT} />
          </div>
          <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.5)" }}>
            Institutional infrastructure · $110M+ trajectory
          </div>
        </div>
      </Card>
    </PanelShell>
  );
}

function ImageMark() {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src="/icon-48.png" alt="" width={36} height={36} style={{ borderRadius: 8, margin: "0 auto", display: "block" }} />
  );
}

export function ProductLoopStepVisual({ stepId }: { stepId: string }) {
  switch (stepId) {
    case "spam":
      return <EmailSpamDiagram />;
    case "pain":
      return <PainMomentDiagram />;
    case "verify-once":
      return <VerifyOnceDiagram />;
    case "global":
      return <GlobalShareDiagram />;
    case "settle":
      return <SettleClosedLoopDiagram />;
    default:
      return null;
  }
}

export function ProductLoopDiagramBackdrop({ stepId }: { stepId: string }) {
  if (stepId === "verify-once") {
    return (
      <div style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
        <svg width="100%" height="100%" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <circle cx="60" cy="60" r="80" fill="rgba(66,133,244,0.08)" />
          <circle cx="340" cy="260" r="100" fill="rgba(16,185,129,0.06)" />
          {[0, 1, 2].map(i => (
            <line key={i} x1={80 + i * 120} y1="160" x2={140 + i * 120} y2="160" stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeDasharray="6 8" />
          ))}
        </svg>
      </div>
    );
  }
  if (stepId === "global") {
    return (
      <div style={{ position: "absolute", inset: 0, opacity: 0.4 }}>
        <svg width="100%" height="100%" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <rect x="40" y="80" width="100" height="60" rx="12" fill="rgba(56,189,248,0.08)" stroke="rgba(56,189,248,0.15)" />
          <rect x="150" y="140" width="100" height="60" rx="12" fill="rgba(245,158,11,0.08)" stroke="rgba(245,158,11,0.15)" />
          <rect x="260" y="80" width="100" height="60" rx="12" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.15)" />
        </svg>
      </div>
    );
  }
  return null;
}
