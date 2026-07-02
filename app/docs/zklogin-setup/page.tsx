"use client";
// FILE: app/docs/zklogin-setup/page.tsx
// In-app copy of docs/ZKLOGIN_BACKEND_SETUP.md for operators.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export default function ZkLoginSetupPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Operator guide"
        title="zkLogin backend setup"
        subtitle="Plain-language checklist for wiring Sui-native verification. If you have never set up zkLogin before, start at Step 1 and go in order."
      />

      <ContentCard title="What you are building">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: 0 }}>
          Users sign in with Google on <Link href="/passport" style={{ color: ACCENT }}>/passport</Link>.
          Abraxas derives a Sui address (zkLogin), runs Veriff for identity stamps, and anchors the stamp bitmask on a Sui Passport object.
          No seed phrase for verification.
        </p>
      </ContentCard>

      <ContentCard title="Step 1. Google OAuth app">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
          If Google says <strong style={{ color: "var(--text-primary)" }}>doesn&apos;t comply with OAuth 2.0 policy</strong>, the redirect URI in the error must be added exactly in Google Cloud Console → Credentials → your Web client → <strong>Authorized redirect URIs</strong>.
        </p>
        <BulletList items={[
          "Google Cloud Console → APIs & Services → Credentials → OAuth Web client",
          "Authorized JavaScript origins: http://localhost:3000, https://abraxas-app.vercel.app, plus each Vercel preview origin you test on",
          "Authorized redirect URIs: {origin}/auth/zklogin/callback for each origin above",
          "Production redirect: https://abraxas-app.vercel.app/auth/zklogin/callback",
          "Optional pin: NEXT_PUBLIC_ZKLOGIN_REDIRECT_URI=https://abraxas-app.vercel.app/auth/zklogin/callback (only prod URI needed in Google)",
          "Set NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID in Vercel",
        ]} />
      </ContentCard>

      <ContentCard title="Step 2. Supabase migration">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
          Run <code style={{ fontFamily: MONO, fontSize: "0.75rem" }}>supabase/migrations/007_sui_zklogin.sql</code> in the SQL editor.
          Creates <code style={{ fontFamily: MONO }}>sui_zklogin_identities</code> and adds <code style={{ fontFamily: MONO }}>sui_address</code> columns.
        </p>
        <BulletList items={[
          "NEXT_PUBLIC_SUPABASE_URL",
          "NEXT_PUBLIC_SUPABASE_ANON_KEY",
          "SUPABASE_SERVICE_ROLE_KEY",
        ]} />
      </ContentCard>

      <ContentCard title="Step 3. Test sign-in">
        <BulletList items={[
          "Visit /passport → Continue with Google",
          "Should land on /auth/zklogin/callback then /passport?signed_in=1",
          "Check sui_zklogin_identities table for a 0x… address",
        ]} />
      </ContentCard>

      <ContentCard title="Step 4. Veriff (identity stamp)">
        <BulletList items={[
          "Veriff Station → API keys: VERIFF_API_KEY, VERIFF_SECRET",
          "Webhook: https://abraxas-app.vercel.app/api/idv/webhook",
          "vendorData carries sui:0x… so webhook issues did:sui credentials",
        ]} />
      </ContentCard>

      <ContentCard title="Step 5. Credential signing keys">
        <p style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
          node scripts/generate-abraxas-key.js → ABRAXAS_SIGNING_KEY + ABRAXAS_PUBLIC_KEY
        </p>
      </ContentCard>

      <ContentCard title="Step 6. On-chain stamps (your next build)">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
          Move package is on devnet (<Link href="/docs/passport-spec" style={{ color: ACCENT }}>see live panel</Link>).
          After Veriff approves, add an API that calls <code style={{ fontFamily: MONO }}>issue_stamps_entry</code> and stores the Passport object ID per Sui address.
        </p>
        <BulletList items={[
          "Fund a sponsor wallet with devnet SUI",
          "npm run sui:deploy:devnet if you need a fresh package",
          "New table sui_passport_objects (sui_address → object_id)",
        ]} />
      </ContentCard>

      <ContentCard title="Step 7. Proving service (transactions only)">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
          Reading passports via RPC does not need the prover. Set NEXT_PUBLIC_ZKLOGIN_PROVER_URL when users sign Sui transactions with zkLogin.
        </p>
      </ContentCard>

      <ContentCard title="Repo map">
        <div style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.8 }}>
          components/sui/ZkLoginSignIn.tsx<br />
          app/api/auth/zklogin/register/route.ts<br />
          app/api/idv/webhook/route.ts<br />
          app/api/sui/passport/route.ts<br />
          sui/abraxas_passport/sources/passport.move
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", margin: "1rem 0 0" }}>
          Full markdown: <code style={{ fontFamily: MONO }}>docs/ZKLOGIN_BACKEND_SETUP.md</code> in the GitHub repo.
        </p>
      </ContentCard>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Link href="/passport" style={{ padding: "0.5rem 1rem", borderRadius: 999, background: ACCENT, color: "#000", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, textDecoration: "none" }}>
          Open Passport →
        </Link>
        <Link href="/docs/passport-spec" style={{ padding: "0.5rem 1rem", borderRadius: 999, border: "1px solid var(--border)", color: ACCENT, fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}>
          Passport spec →
        </Link>
      </div>
    </RedesignPage>
  );
}
