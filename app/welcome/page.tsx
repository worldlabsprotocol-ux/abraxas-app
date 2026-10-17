"use client";

import { useRouter } from "next/navigation";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { NativeAccountPasskeyPanel } from "@/components/account/NativeAccountPasskeyPanel";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <RedesignPage accent="developer" maxWidth={720}>
      <PageHeader
        eyebrow="Abraxas"
        title="Welcome to Abraxas"
        subtitle="Verification infrastructure built around privacy. Sign in only when a protected operation requires it."
      />

      <ContentCard title="Explore verification">
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Public product exploration and policy previews — no Google sign-in, wallet, or personal identity required.
        </p>
        <Btn href="/try" size="sm">
          Explore verification
        </Btn>
      </ContentCard>

      <ContentCard title="Start sandbox">
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Create a passkey-backed Abraxas account, then provision a tenant-scoped sandbox application. API keys remain
          for server integrations; your browser session authorizes Launchpad access.
        </p>
        <NativeAccountPasskeyPanel
          mode="register"
          label="Create account & continue"
          onSuccess={() => {
            void fetch("/api/sandbox/enroll", {
              method: "POST",
              credentials: "include",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ application_name: "Sandbox application" }),
            }).then(async (res) => {
              if (res.ok) router.push("/developers/launchpad");
              else router.push("/account/applications");
            });
          }}
        />
        <div style={{ marginTop: "0.75rem" }}>
          <NativeAccountPasskeyPanel
            mode="authenticate"
            label="Returning account — sign in"
            onSuccess={() => router.push("/account/applications")}
          />
        </div>
      </ContentCard>

      <ContentCard title="Open Passport">
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Holder credentials and policy-specific verification — only when you choose to verify or share evidence.
        </p>
        <Btn href="/passport" size="sm">
          Open Passport
        </Btn>
      </ContentCard>
    </RedesignPage>
  );
}
