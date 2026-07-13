// FILE: components/verify/VerifyPageIntro.tsx
// Verify page — one question: How do I trust an asset?

export function VerifyPageIntro() {
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(2rem, 6vw, 4rem) clamp(1rem, 3vw, 2rem) 0" }}>
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
        Trust an asset before you transact
      </h1>
      <p style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "0.9rem", color: "var(--text-secondary)",
        lineHeight: 1.7, maxWidth: 560, margin: 0,
      }}>
        Look up any Abraxas registry record — scope, status, and what was verified. No sign-in required.
      </p>
    </div>
  );
}
