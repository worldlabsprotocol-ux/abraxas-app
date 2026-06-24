"use client";
// FILE: app/legal/privacy/page.tsx
// Real draft, tailored to what Abraxas actually does (Veriff biometric
// verification, Supabase storage, Solana wallets, stablecoin payments,
// Reg D offerings). This is a starting point, not a substitute for
// review by an actual attorney, especially given the biometric data
// and securities offerings involved.

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

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight:"100vh", background:"#0A0C10", color:"#F8FAFC" }}>
      <div style={{ padding:"1rem clamp(1rem,3vw,1.5rem)", borderBottom:`1px solid ${BDR}` }}>
        <span style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:700 }}>Privacy Policy</span>
      </div>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"2rem clamp(1rem,3vw,1.5rem)" }}>
        <p style={{ fontFamily:S, fontSize:"0.78rem", color:"rgba(255,255,255,0.4)",
                     marginBottom:"2rem" }}>
          Last updated: June 2026. Abraxas Protocol, operated under World Labs Protocol.
        </p>

        <Section title="What we collect">
          <p>When you sign in, we collect your email address and create a Solana wallet
          on your behalf. If you choose to verify your identity through Abraxas
          Precheck, our certified verification partner, Veriff, collects your
          government ID and a liveness check directly, we never see or store your
          raw identification documents ourselves. If you submit documents for
          Business, Accredited Investor, or Asset Owner verification, those files
          are stored securely and reviewed by our team. If you make a purchase or
          express investment interest, we collect your email, the transaction
          details, and, where relevant, a shipping address.</p>
        </Section>

        <Section title="How we use it">
          <p>We use your information to create and maintain your account, process
          verification requests, confirm stablecoin transactions, fulfill
          purchases, and communicate with you about the status of any of the
          above. We do not sell your personal information to third parties.</p>
        </Section>

        <Section title="Third parties involved">
          <p>Identity verification is performed by Veriff, a certified third-party
          provider, under their own privacy practices. Your data is stored using
          Supabase, our database provider. Wallet infrastructure runs on the
          Solana blockchain, where transaction records are public by design,
          your name and personal information are not published on-chain, only
          your wallet address and transaction amounts are. If you use the Swap
          feature, that runs through HeroSwap, a separate third-party service
          with its own privacy practices.</p>
        </Section>

        <Section title="Biometric data">
          <p>Identity verification through Veriff may involve biometric data
          (a liveness check comparing your face to your ID). This data is
          processed by Veriff under their own retention and deletion policies.
          Abraxas receives only a verification result (approved, pending, or
          declined), not your underlying biometric data.</p>
        </Section>

        <Section title="Your rights">
          <p>You can request a copy of the information we hold about you, request
          corrections, or request deletion of your account by contacting us
          directly. Some information, particularly records related to completed
          securities transactions, may need to be retained for legal and
          regulatory reasons even after a deletion request.</p>
        </Section>

        <Section title="Contact">
          <p>Questions about this policy can be sent to the contact address listed
          on our contact form.</p>
        </Section>

        <p style={{ fontFamily:S, fontSize:"0.72rem", color:"rgba(255,255,255,0.3)",
                     marginTop:"2rem", fontStyle:"italic" }}>
          This policy is a working draft and has not yet been reviewed by legal
          counsel. It should not be relied on as a final, binding privacy policy
          until that review is complete.
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
