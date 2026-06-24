"use client";
// FILE: app/legal/terms/page.tsx
// Comprehensive terms, matching the depth of an established
// platform's terms of service, written for what Abraxas actually
// does (Reg D securities offerings, manual transaction review,
// identity verification, third-party Swap integration).

import { BottomNav } from "@/components/BottomNav";

const S = "'Inter',system-ui,-apple-system,sans-serif";
const BDR = "var(--border)";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:"1.75rem" }}>
      <h2 style={{ fontFamily:S, fontSize:"1rem", fontWeight:700, color:"var(--text-primary)",
                    marginBottom:"0.625rem" }}>
        {title}
      </h2>
      <div style={{ fontFamily:S, fontSize:"0.85rem", color:"var(--text-secondary)",
                     lineHeight:1.75 }}>
        {children}
      </div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text-primary)" }}>
      <div style={{ padding:"1rem clamp(1rem,3vw,1.5rem)", borderBottom:`1px solid ${BDR}` }}>
        <span style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:700 }}>Terms of Service</span>
      </div>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"2rem clamp(1rem,3vw,1.5rem)" }}>
        <p style={{ fontFamily:S, fontSize:"0.78rem", color:"var(--text-muted)",
                     marginBottom:"2rem" }}>
          Last updated: June 2026. These Terms of Service govern your use of Abraxas
          Protocol, operated under World Labs Protocol ("Abraxas," "we," "us," or
          "our"). By using our website and services (the "Services"), you agree to
          these Terms.
        </p>

        <Section title="1. What Abraxas is">
          <p>Abraxas is a verification and credential layer for real-world assets. We
          are not a bank, broker-dealer, or registered investment adviser. Where
          investment opportunities are presented on the Services, each is structured
          under a specific securities exemption, most commonly Reg D 506(c) for
          accredited investors, with its own offering documents that govern that
          specific transaction. Nothing in these Terms should be read as an offer to
          sell securities in any jurisdiction where such an offer would be unlawful.</p>
        </Section>

        <Section title="2. Eligibility">
          <p>You must be at least 18 years old to use the Services. By using the
          Services, you represent that you meet this requirement and that you have
          the legal capacity to enter into these Terms.</p>
        </Section>

        <Section title="3. No guarantee of returns">
          <p>Nothing on the Services is a guarantee of any financial outcome. Stated
          yield, occupancy, income figures, or projected returns for any asset are
          historical or projected figures only, not a promise of future performance.
          You are solely responsible for evaluating any investment opportunity and
          should consult your own financial, tax, and legal advisors before
          committing funds.</p>
        </Section>

        <Section title="4. How transactions are processed">
          <p>Most transactions on Abraxas currently involve sending stablecoin (USDC
          or USDT) directly to a treasury wallet, after which our team manually
          confirms the transfer and follows up by email. This is not an instant or
          fully automated process today. Typical confirmation time is same day to
          one business day. By using the Services, you acknowledge and accept that
          transactions are reviewed by a person, not settled automatically, and that
          delays can occur.</p>
        </Section>

        <Section title="5. Identity verification">
          <p>Certain features require identity verification, performed through
          Veriff, a certified third-party provider, or through manual document
          review by our team. You agree to provide accurate, current information
          during this process. We reserve the right to decline, delay, or revoke any
          verification at our discretion, including where we suspect fraud,
          misrepresentation, or a violation of these Terms.</p>
        </Section>

        <Section title="6. Acceptable use">
          <p style={{ marginBottom:"0.75rem" }}>You agree not to:</p>
          <p style={{ marginBottom:"0.4rem" }}>• Use the Services for any unlawful purpose;</p>
          <p style={{ marginBottom:"0.4rem" }}>• Misrepresent your identity, the assets you submit
          for verification, or your eligibility for any offering;</p>
          <p style={{ marginBottom:"0.4rem" }}>• Attempt to circumvent, disable, or interfere with
          our verification processes or security measures;</p>
          <p>• Use the Services to facilitate money laundering, fraud, or any other
          financial crime.</p>
        </Section>

        <Section title="7. Third-party services">
          <p>The Services integrate third-party providers, including Veriff for
          identity verification, Supabase for data storage, and HeroSwap for the
          Swap feature. Your use of those specific features is also governed by each
          provider's own terms, and we are not responsible for the practices or
          availability of third-party services.</p>
        </Section>

        <Section title="8. Intellectual property">
          <p>The Abraxas name, branding, and the content we create describing our
          Services belong to us or our licensors. Verified asset listings remain the
          property of their respective owners, made available through the Services
          under the terms of each specific verification and offering arrangement.</p>
        </Section>

        <Section title="9. Disclaimer of warranties">
          <p>The Services are provided "as is" and "as available," without warranties
          of any kind, whether express or implied, including warranties of
          merchantability, fitness for a particular purpose, or non-infringement. We
          do not warrant that the Services will be uninterrupted, error-free, or
          completely secure.</p>
        </Section>

        <Section title="10. Limitation of liability">
          <p>To the fullest extent permitted by law, Abraxas and its founders,
          employees, and partners will not be liable for any indirect, incidental,
          special, consequential, or punitive damages, including losses related to
          investment decisions made based on information presented on the Services,
          arising from your use of, or inability to use, the Services.</p>
        </Section>

        <Section title="11. Indemnification">
          <p>You agree to indemnify and hold Abraxas harmless from any claims, losses,
          or damages, including reasonable legal fees, arising from your violation of
          these Terms or your misuse of the Services.</p>
        </Section>

        <Section title="12. Governing law and disputes">
          <p>These Terms are governed by the laws of the State of Wyoming, without
          regard to its conflict-of-laws principles. Any dispute arising from these
          Terms or your use of the Services will be resolved in the courts located in
          Wyoming, unless otherwise required by applicable securities law.</p>
        </Section>

        <Section title="13. Severability and entire agreement">
          <p>If any provision of these Terms is found unenforceable, the remaining
          provisions remain in full effect. These Terms, together with our Privacy
          Policy and any offering-specific documents, constitute the entire agreement
          between you and Abraxas regarding the Services.</p>
        </Section>

        <Section title="14. Changes to these terms">
          <p>We may update these Terms from time to time. The date at the top of this
          page reflects the most recent revision. Continued use of the Services after
          a change is posted constitutes acceptance of the updated Terms.</p>
        </Section>

        <Section title="15. Contact">
          <p>Questions about these Terms can be sent through the contact form on our
          website.</p>
        </Section>
      </div>
      <BottomNav />
    </div>
  );
}
