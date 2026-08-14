// FILE: components/verify/VerifyPageIntro.tsx
// Server-rendered intro. visible to crawlers and first paint before client hydrates.

export function VerifyPageIntro() {
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(2rem, 6vw, 4rem) clamp(1rem, 3vw, 2rem) 0" }}>
      <div style={{
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em",
        textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.75rem",
      }}>
        Public verifier
      </div>
      <h1 style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800,
        letterSpacing: "-0.03em", color: "var(--text-primary)",
        margin: "0 0 0.75rem", lineHeight: 1.1,
      }}>
        Verify Abraxas proofs
      </h1>
      <p style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "0.9rem", color: "var(--text-secondary)",
        lineHeight: 1.7, maxWidth: 720, margin: "0 0 0.5rem",
      }}>
        Three distinct tools for three audiences: Partner Flow receipt verification for integrators,
        registry lookup for asset records, and credential JWT testing for relying-party demos.
      </p>
      <p style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "0.78rem", color: "var(--text-muted)",
        lineHeight: 1.65, maxWidth: 720, margin: "0 0 1.25rem",
      }}>
        <strong style={{ color: "var(--text-secondary)" }}>Partner receipt</strong> ·{" "}
        <strong style={{ color: "var(--text-secondary)" }}>Registry lookup</strong> ·{" "}
        <strong style={{ color: "var(--text-secondary)" }}>Credential JWT</strong>
      </p>
    </div>
  );
}
