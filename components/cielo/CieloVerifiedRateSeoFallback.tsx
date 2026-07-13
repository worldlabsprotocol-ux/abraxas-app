// FILE: components/cielo/CieloVerifiedRateSeoFallback.tsx
// Static hero for crawlers — consistent with live verified-rate flow.

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function CieloVerifiedRateSeoFallback() {
  return (
    <header id="cielo-verified-rate-seo-fallback" style={{ marginBottom: "1.25rem" }}>
      <h1 style={{
        fontFamily: FONT,
        fontSize: "clamp(1.25rem, 3vw, 1.65rem)",
        fontWeight: 800,
        letterSpacing: "-0.03em",
        color: "var(--text-primary, #F8FAFC)",
        margin: "0 0 0.5rem",
      }}>
        Cielo verified guest flow
      </h1>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.82rem",
        color: "var(--text-secondary, rgba(248,250,252,0.75))",
        lineHeight: 1.65,
        margin: 0,
        maxWidth: 520,
      }}>
        Genesis hospitality pilot on Cielo Sunrise — sign in with Google, approve what gets shared,
        and complete guest eligibility. Booking settles in USDC on Sui.
      </p>
    </header>
  );
}
