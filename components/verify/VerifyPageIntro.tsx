// FILE: components/verify/VerifyPageIntro.tsx
// Server-rendered intro — visible to crawlers and first paint before client hydrates.

export function VerifyPageIntro() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(2rem, 6vw, 4rem) clamp(1rem, 3vw, 2rem) 0" }}>
      <div style={{
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em",
        textTransform: "uppercase", color: "#10B981", marginBottom: "0.75rem",
      }}>
        Public verifier
      </div>
      <h1 style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800,
        letterSpacing: "-0.03em", color: "var(--text-primary)",
        margin: "0 0 0.75rem", lineHeight: 1.1,
      }}>
        Verify an Abraxas record
      </h1>
      <p style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "0.9rem", color: "var(--text-secondary)",
        lineHeight: 1.7, maxWidth: 720, margin: "0 0 0.5rem",
      }}>
        Paste an asset ID, credential JWT, or wallet address. Run sample checks in under 15 seconds —
        valid, not found, and revoked states — without signing in.
      </p>
      <p style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "0.78rem", color: "var(--text-muted)",
        lineHeight: 1.65, maxWidth: 720, margin: "0 0 1.25rem",
      }}>
        Three modes: <strong style={{ color: "var(--text-secondary)" }}>Registry</strong> (assets &amp; DIDs) ·{" "}
        <strong style={{ color: "var(--text-secondary)" }}>Credential JWT</strong> (partner API) ·{" "}
        <strong style={{ color: "var(--text-secondary)" }}>Policy gate</strong> (Abraxas Verified Participant v1)
      </p>
    </div>
  );
}
