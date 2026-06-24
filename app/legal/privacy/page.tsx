"use client";
// FILE: app/legal/privacy/page.tsx
// Comprehensive privacy policy, structured to match the depth of an
// established consumer platform's policy: data collection, children's
// privacy, state-specific rights, do-not-track, service providers,
// and contact information, all written for what Abraxas actually
// does (Veriff biometric verification, Supabase storage, Solana
// wallets, stablecoin transactions, Reg D securities offerings).

import { BottomNav } from "@/components/BottomNav";
import { LiveBackground } from "@/components/LiveBackground";

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

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text-primary)" }}>
      <LiveBackground />
      <div style={{ padding:"1rem clamp(1rem,3vw,1.5rem)", borderBottom:`1px solid ${BDR}` }}>
        <span style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:700 }}>Privacy Policy</span>
      </div>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"2rem clamp(1rem,3vw,1.5rem)" }}>
        <p style={{ fontFamily:S, fontSize:"0.78rem", color:"var(--text-muted)",
                     marginBottom:"2rem" }}>
          Last updated: June 2026. This Privacy Policy describes how Abraxas Protocol,
          operated under World Labs Protocol ("Abraxas," "we," "us," or "our"),
          collects, uses, and discloses information when you use our website and
          services (the "Services"). By using the Services, you accept and consent
          to this Privacy Policy.
        </p>

        <Section title="1. Information we collect">
          <p style={{ marginBottom:"0.75rem" }}>The information we collect depends on how you
          interact with the Services. This includes:</p>
          <p style={{ marginBottom:"0.5rem" }}><strong>Account information.</strong> Your email
          address, and the Solana wallet address we create on your behalf when you sign in.</p>
          <p style={{ marginBottom:"0.5rem" }}><strong>Identity verification information.</strong>
          If you complete Abraxas Precheck, our certified partner Veriff collects your
          government ID and a liveness check directly. We receive a verification
          result from Veriff, not your underlying ID images or biometric data. If you
          submit documents for Business, Accredited Investor, or Asset Owner
          verification, those documents are stored securely and reviewed by our team.</p>
          <p style={{ marginBottom:"0.5rem" }}><strong>Transaction information.</strong> When you
          make a purchase, book a stay, or express investment interest, we collect your
          email, the asset or item involved, the amount, and, where relevant, a
          shipping address or booking dates.</p>
          <p><strong>Automatically collected information.</strong> Like most websites, we
          may collect your IP address, browser type, device type, and pages viewed,
          to help us understand usage and maintain security.</p>
        </Section>

        <Section title="2. How we use your information">
          <p>We use your information to create and maintain your account, process
          identity verification, confirm stablecoin transactions, fulfill purchases
          and bookings, communicate with you about the status of any of the above,
          maintain the security of the Services, and comply with legal obligations,
          including recordkeeping required under securities law for any investment
          offerings you participate in.</p>
        </Section>

        <Section title="3. Children's privacy">
          <p>The Services are not directed to, and we do not knowingly collect personal
          information from, anyone under the age of 18. If we learn that we have
          collected personal information from someone under 18, we will take steps
          to delete that information. If you believe a minor has provided us with
          personal information, please contact us using the information in Section 8.</p>
        </Section>

        <Section title="4. Do-not-track signals">
          <p>Some browsers include a Do-Not-Track ("DNT") feature. No uniform standard
          for recognizing DNT signals has been finalized across the industry, so we
          do not currently respond to DNT signals in a particular way, but we limit
          our own tracking to what is necessary to operate and secure the Services.</p>
        </Section>

        <Section title="5. How we share your information">
          <p style={{ marginBottom:"0.75rem" }}>We do not sell your personal information.
          We may share information with:</p>
          <p style={{ marginBottom:"0.5rem" }}><strong>Service providers.</strong> Veriff
          (identity verification), Supabase (data storage), and HeroSwap (the Swap
          feature, a separate third-party service with its own privacy practices).
          Each provider processes information only as needed to provide their
          service to us.</p>
          <p style={{ marginBottom:"0.5rem" }}><strong>The Solana blockchain.</strong> Wallet
          addresses and transaction amounts are recorded on a public blockchain by
          design. Your name and personal information are not published on-chain.</p>
          <p><strong>Legal and safety reasons.</strong> We may disclose information to
          comply with a court order, law, or legal process, or to protect the rights,
          property, or safety of Abraxas, our users, or others.</p>
        </Section>

        <Section title="6. Your rights">
          <p>Depending on where you live, you may have the right to request access to,
          correction of, or deletion of your personal information. If you are a
          resident of California, Virginia, or another state with its own consumer
          privacy law, you may have additional rights under that law, including the
          right to opt out of certain uses of your data. To exercise any of these
          rights, contact us using the information in Section 8. Some information,
          particularly records related to completed securities transactions, may
          need to be retained for legal and regulatory reasons even after a deletion
          request.</p>
        </Section>

        <Section title="7. Data security">
          <p>We use reasonable technical and organizational measures designed to
          protect your information. No method of transmission or storage is
          completely secure, and we cannot guarantee absolute security.</p>
        </Section>

        <Section title="8. Contact us">
          <p>Questions or requests regarding this Privacy Policy can be sent through
          the contact form on our website.</p>
        </Section>

        <Section title="9. Changes to this policy">
          <p>We may update this Privacy Policy from time to time. The date at the top
          of this page reflects the most recent revision. Continued use of the
          Services after a change is posted constitutes acceptance of the update.</p>
        </Section>
      </div>
      <BottomNav />
    </div>
  );
}
