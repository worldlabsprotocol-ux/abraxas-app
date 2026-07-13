"use client";
// FILE: components/redesign/ProductLoopStepVisual.tsx
// Step-specific visuals — distinct photo overlays and diagram modes per step.

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const BLUE = "#4285F4";
const PURPLE = "#A855F7";

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

/** Registry grid — distinct from property photos */
function BrowseDiagram() {
  const tiles = [
    { id: "Cielo", level: "L3", color: ACCENT },
    { id: "Smyrna", level: "L3", color: "#38BDF8" },
    { id: "Battery", level: "L2", color: "#A855F7" },
    { id: "Intl.", level: "L1", color: "#F59E0B" },
  ];
  return (
    <PanelShell align="stretch">
      <div style={{ width: "100%", maxWidth: 320, alignSelf: "center" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.45rem", marginBottom: "0.55rem",
        }}>
          {tiles.map(t => (
            <div key={t.id} style={{
              padding: "0.65rem 0.55rem", borderRadius: 12,
              background: `${t.color}12`, border: `1px solid ${t.color}33`,
            }}>
              <div style={{ fontFamily: MONO, fontSize: "0.48rem", color: t.color, fontWeight: 700, marginBottom: 3 }}>{t.level}</div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "#fff" }}>{t.id}</div>
              <div style={{ fontFamily: FONT, fontSize: "0.55rem", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>Assurance record</div>
            </div>
          ))}
        </div>
        <div style={{
          padding: "0.55rem 0.65rem", borderRadius: 10,
          background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.1)",
          fontFamily: FONT, fontSize: "0.62rem", color: "rgba(255,255,255,0.65)", textAlign: "center",
        }}>
          Public registry · browse before you sign in
        </div>
      </div>
    </PanelShell>
  );
}

function BookMock() {
  return (
    <PanelShell>
      <Card width={240} accent="#38BDF8">
        <div style={{ padding: "1.1rem 1rem", textAlign: "center" }}>
          <div style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 900, color: "#38BDF8", marginBottom: "0.35rem" }}>
            1,240 USDC
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "#fff", marginBottom: "0.25rem" }}>
            Cielo · 3 nights
          </div>
          <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "rgba(255,255,255,0.5)" }}>
            Settles on Sui
          </div>
        </div>
      </Card>
    </PanelShell>
  );
}

function SignInDiagram() {
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
              Continue with Google
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
              Wallet created automatically — no seed phrase
            </div>
          </div>
        </Card>
      </div>
    </PanelShell>
  );
}

function ConsentDiagram() {
  return (
    <PanelShell align="stretch">
      <div style={{ width: "100%", maxWidth: 340, alignSelf: "center" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap",
          gap: "0.35rem", marginBottom: "0.85rem",
        }}>
          <FlowNode label="Cielo" sub="partner" color={PURPLE} />
          <FlowArrow />
          <FlowNode label="You" sub="approve" color="#F59E0B" />
          <FlowArrow />
          <FlowNode label="Proof" sub="minimum" color={ACCENT} />
        </div>
        <Card width={300} accent={PURPLE}>
          <div style={{ padding: "1rem 0.95rem" }}>
            <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: PURPLE, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
              What gets shared
            </div>
            {[
              { k: "Shared", v: "Eligibility confirmed", ok: true },
              { k: "Hidden", v: "ID documents", ok: false },
              { k: "Receipt", v: "Access tab", ok: true },
            ].map(row => (
              <div key={row.k} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: "rgba(255,255,255,0.45)" }}>{row.k}</span>
                <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: row.ok ? ACCENT : "rgba(255,255,255,0.35)", fontWeight: 600 }}>{row.v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PanelShell>
  );
}

function VerifyMock() {
  return (
    <PanelShell>
      <Card width={310}>
        <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: "0.52rem", color: "rgba(255,255,255,0.5)" }}>GET /verify/ABX-RE-HOSP-001</span>
          <span style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, padding: "0.2rem 0.45rem", borderRadius: 999, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)" }}>
            VERIFIED
          </span>
        </div>
        <div style={{ padding: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.85rem" }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: ACCENT, fontSize: "1rem", fontWeight: 800,
            }}>✓</div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "#fff" }}>Cielo Sunrise</div>
              <div style={{ fontFamily: FONT, fontSize: "0.65rem", color: "rgba(255,255,255,0.55)" }}>AAS-1 · portable proof</div>
            </div>
          </div>
          {[
            { k: "Record", v: "ABX-RE-HOSP-001" },
            { k: "Assurance", v: "L3 verified" },
            { k: "Live ops", v: "Airbnb active" },
            { k: "Reuse", v: "Any partner" },
          ].map(row => (
            <div key={row.k} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: "rgba(255,255,255,0.45)" }}>{row.k}</span>
              <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: ACCENT, fontWeight: 600 }}>{row.v}</span>
            </div>
          ))}
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
    case "browse":
      return <BrowseDiagram />;
    case "book":
      return <BookMock />;
    case "signin":
      return <SignInDiagram />;
    case "consent":
      return <ConsentDiagram />;
    case "verify":
      return <VerifyMock />;
    default:
      return null;
  }
}

export function ProductLoopDiagramBackdrop({ stepId }: { stepId: string }) {
  if (stepId === "signin") {
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
  if (stepId === "consent") {
    return (
      <div style={{ position: "absolute", inset: 0, opacity: 0.4 }}>
        <svg width="100%" height="100%" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <rect x="40" y="80" width="100" height="60" rx="12" fill="rgba(168,85,247,0.08)" stroke="rgba(168,85,247,0.15)" />
          <rect x="150" y="140" width="100" height="60" rx="12" fill="rgba(245,158,11,0.08)" stroke="rgba(245,158,11,0.15)" />
          <rect x="260" y="80" width="100" height="60" rx="12" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.15)" />
        </svg>
      </div>
    );
  }
  return null;
}
