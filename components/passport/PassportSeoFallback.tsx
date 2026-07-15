// FILE: components/passport/PassportSeoFallback.tsx
// Static explainer for crawlers and link previews — matches live page promise.

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function PassportSeoFallback() {
  return (
    <section
      id="passport-seo-fallback"
      aria-label="Passport overview"
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "clamp(2rem,5vw,3rem) clamp(1rem,4vw,2.5rem) 1rem",
      }}
    >
      <h1 style={{
        fontFamily: FONT,
        fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)",
        fontWeight: 800,
        lineHeight: 1.15,
        color: "var(--text-primary, #F8FAFC)",
        letterSpacing: "-0.03em",
        margin: "0 0 0.65rem",
      }}>
        Abraxas Passport
      </h1>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.85rem",
        color: "var(--text-secondary, rgba(248,250,252,0.75))",
        lineHeight: 1.65,
        maxWidth: 560,
        margin: 0,
      }}>
        Prove what you control. Partners check only what you approve — eligibility outcomes,
        not document folders. Sign in with Google to create your Passport and reuse verification
        across Cielo and other relying parties.
      </p>
    </section>
  );
}
