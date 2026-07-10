"use client";
// FILE: components/redesign/ProductLoopStepVisual.tsx
// Step-specific mock UI for the product loop — fills the visual panel after step 1.

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem 1.25rem 4.5rem",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}

function Card({ children, width = 280 }: { children: React.ReactNode; width?: number }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: width,
        borderRadius: 16,
        background: "rgba(12,18,24,0.92)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
        backdropFilter: "blur(12px)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function BookMock() {
  return (
    <PanelShell>
      <Card width={300}>
        <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
            Cielo Sunrise · Genesis pilot
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>3-night wellness stay</div>
        </div>
        <div style={{ padding: "0.85rem 1rem", display: "grid", gap: "0.55rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.65)" }}>
            <span>Check-in</span>
            <span style={{ color: "#fff", fontWeight: 600 }}>Fri · Aug 14</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.65)" }}>
            <span>Check-out</span>
            <span style={{ color: "#fff", fontWeight: 600 }}>Mon · Aug 17</span>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "0.15rem 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.65)" }}>Total</span>
            <span style={{ fontFamily: FONT, fontSize: "1.15rem", fontWeight: 800, color: ACCENT }}>$1,240</span>
          </div>
          <div
            style={{
              marginTop: "0.35rem",
              padding: "0.65rem",
              borderRadius: 10,
              background: "#000",
              border: "1px solid rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.45rem",
            }}
          >
            <span style={{ fontFamily: FONT, fontSize: "0.95rem", color: "#fff", fontWeight: 600 }}> Pay</span>
            <span style={{ fontFamily: FONT, fontSize: "0.82rem", color: "#fff", fontWeight: 700 }}>Apple Pay</span>
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.58rem", color: "rgba(255,255,255,0.45)", textAlign: "center" }}>
            Fiat on-ramp · settles USDC on-chain
          </div>
        </div>
      </Card>
    </PanelShell>
  );
}

function SignInMock() {
  return (
    <PanelShell>
      <Card width={290}>
        <div style={{ padding: "1.25rem 1.15rem 1.1rem", textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              margin: "0 auto 0.85rem",
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ImageMark />
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "#fff", marginBottom: "0.35rem" }}>
            Sign in to Abraxas
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.55, marginBottom: "1rem" }}>
            One click creates your wallet — no seed phrase, no extension.
          </div>
          <div
            style={{
              padding: "0.65rem 1rem",
              borderRadius: 999,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.55rem",
            }}
          >
            <span style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 800, color: "#4285F4" }}>G</span>
            <span style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "#1f1f1f" }}>Continue with Google</span>
          </div>
          <div style={{ marginTop: "0.85rem", display: "flex", justifyContent: "center", gap: "0.35rem", flexWrap: "wrap" }}>
            {["Passport ready", "Sui wallet", "Optional ID"].map(tag => (
              <span
                key={tag}
                style={{
                  fontFamily: MONO,
                  fontSize: "0.48rem",
                  padding: "0.25rem 0.45rem",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </PanelShell>
  );
}

function ConsentMock() {
  return (
    <PanelShell>
      <Card width={290}>
        <div style={{ padding: "1.1rem 1rem 0.85rem" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.65rem" }}>
            Partner request
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "#fff", marginBottom: "0.35rem" }}>
            Cielo verified guest rate
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.55, marginBottom: "0.85rem" }}>
            Share eligibility proof only — not your full profile or documents.
          </div>
          {[
            { k: "Shared", v: "Eligibility confirmed" },
            { k: "Not shared", v: "ID documents" },
            { k: "Receipt", v: "Saved to Access" },
          ].map(row => (
            <div key={row.k} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: "rgba(255,255,255,0.45)" }}>{row.k}</span>
              <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: "#fff", fontWeight: 600 }}>{row.v}</span>
            </div>
          ))}
          <div
            style={{
              marginTop: "0.85rem",
              padding: "0.65rem",
              borderRadius: 10,
              background: ACCENT,
              textAlign: "center",
              fontFamily: FONT,
              fontSize: "0.82rem",
              fontWeight: 800,
              color: "#04130C",
            }}
          >
            Approve & share proof
          </div>
        </div>
      </Card>
    </PanelShell>
  );
}

function VerifyMock() {
  return (
    <PanelShell>
      <Card width={310}>
        <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: "0.52rem", color: "rgba(255,255,255,0.5)" }}>POST /api/credentials/verify</span>
          <span style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, padding: "0.2rem 0.45rem", borderRadius: 999, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)" }}>
            200 OK
          </span>
        </div>
        <div style={{ padding: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.85rem" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(16,185,129,0.15)",
                border: "1px solid rgba(16,185,129,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: ACCENT,
                fontSize: "1rem",
                fontWeight: 800,
              }}
            >
              ✓
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "#fff" }}>Credential valid</div>
              <div style={{ fontFamily: FONT, fontSize: "0.65rem", color: "rgba(255,255,255,0.55)" }}>Portable proof · any partner</div>
            </div>
          </div>
          {[
            { k: "Subject", v: "did:sui:…abx7f2" },
            { k: "Level", v: "identity:L2" },
            { k: "Screening", v: "clear" },
            { k: "Policy", v: "approved" },
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
    <img src="/icon-48.png" alt="" width={22} height={22} style={{ borderRadius: 5 }} />
  );
}

function BrowseOverlay() {
  return (
    <PanelShell>
      <div
        style={{
          alignSelf: "flex-end",
          width: "100%",
          maxWidth: 260,
          padding: "0.65rem 0.75rem",
          borderRadius: 12,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
          Public registry
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "#fff" }}>Smyrna · L3 assurance</div>
        <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "rgba(255,255,255,0.55)", marginTop: 2 }}>No login · browse first</div>
      </div>
    </PanelShell>
  );
}

export function ProductLoopStepVisual({ stepId }: { stepId: string }) {
  switch (stepId) {
    case "browse":
      return <BrowseOverlay />;
    case "book":
      return <BookMock />;
    case "signin":
      return <SignInMock />;
    case "consent":
      return <ConsentMock />;
    case "verify":
      return <VerifyMock />;
    default:
      return null;
  }
}
