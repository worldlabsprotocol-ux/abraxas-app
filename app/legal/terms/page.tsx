"use client";
// FILE: app/legal/terms/page.tsx
// Same caveat as the privacy policy: real starting draft tailored to
// what Abraxas actually does, needs actual attorney review before
// being treated as final, especially given the Reg D offerings.

import { BottomNav } from "@/components/BottomNav";

const S = "'Inter',system-ui,-apple-system,sans-serif";
const BDR = "#1C2333";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:"1.75rem" }}>
      <h2 style={{ fontFamily:S, fontSize:"1rem", fontWeight:700, color:"#F8FAFC",
                    marginBottom:"0.625rem" }}>
        {title}
      </h2>
      <div style={{ fontFamily:S, fontSize:"0.85rem", color:"rgba(255,255,255,0.6)",
                     lineHeight:1.75 }}>
        {children}
      </div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <div style={{ minHeight:"100vh", background:"#0A0C10", color:"#F8FAFC" }}>
      <div style={{ padding:"1rem clamp(1rem,3vw,1.5rem)", borderBottom:`1px solid ${BDR}` }}>
        <span style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:700 }}>Terms of Service</span>
      </div>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"2rem clamp(1rem,3vw,1.5rem)" }}>
        <p style={{ fontFamily:S, fontSize:"0.78rem", color:"rgba(255,255,255,0.4)",
                     marginBottom:"2rem" }}>
          Last updated: June 2026. Abraxas Protocol, operated under World Labs Protocol.
        </p>

        <Section title="What Abraxas is">
          <p>Abraxas is a verification and credential layer for real-world assets.
          We are not a bank, broker-dealer, or registered investment adviser.
          Where investment opportunities are offered on the platform, each one
          is structured under a specific securities exemption (most commonly
          Reg D 506(c) for accredited investors), with its own offering
          documents that govern that specific transaction.</p>
        </Section>

        <Section title="No guarantee of returns">
          <p>Nothing on this platform is a guarantee of any financial outcome.
          Past performance of any asset, including stated yield, occupancy, or
          income figures, is not a guarantee of future results. You should
          independently evaluate any investment opportunity and consult your
          own financial and legal advisors before committing funds.</p>
        </Section>

        <Section title="How transactions are processed">
          <p>Most transactions on Abraxas currently involve sending stablecoin
          (USDC or USDT) directly to a treasury wallet, after which our team
          manually confirms the transfer and follows up by email. This is not
          an instant or fully automated process today. Typical confirmation
          time is same day to one business day. By using this platform, you
          acknowledge that transactions are reviewed by a person, not settled
          automatically.</p>
        </Section>

        <Section title="Identity verification">
          <p>Certain features require identity verification, performed through
          Veriff, a certified third-party provider, or through manual document
          review by our team. You agree to provide accurate information during
          this process. We reserve the right to decline or revoke verification
          at our discretion.</p>
        </Section>

        <Section title="Acceptable use">
          <p>You agree not to use Abraxas for any unlawful purpose, to misrepresent
          your identity or the assets you submit for verification, or to
          attempt to circumvent our verification processes.</p>
        </Section>

        <Section title="Third-party services">
          <p>Abraxas integrates third-party services, including Veriff for
          identity verification, Supabase for data storage, and HeroSwap for
          the Swap feature. Your use of those features is also subject to
          each provider's own terms.</p>
        </Section>

        <Section title="Limitation of liability">
          <p>Abraxas is provided "as is." To the fullest extent permitted by law,
          we are not liable for indirect, incidental, or consequential damages
          arising from your use of the platform, including losses related to
          investment decisions made based on information presented here.</p>
        </Section>

        <Section title="Changes to these terms">
          <p>We may update these terms from time to time. Continued use of the
          platform after changes are posted constitutes acceptance of the
          updated terms.</p>
        </Section>

        <p style={{ fontFamily:S, fontSize:"0.72rem", color:"rgba(255,255,255,0.3)",
                     marginTop:"2rem", fontStyle:"italic" }}>
          This is a working draft and has not yet been reviewed by legal counsel.
          Given the securities offerings involved, this should not be treated as
          final or binding until that review is complete.
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
