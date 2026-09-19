// FILE: app/login/page.tsx
import { AccountAccessFirstPaint } from "@/components/product/AccountAccessFirstPaint";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

export default function LoginPage() {
  return (
    <RedesignPage accent="passport" maxWidth={640}>
      <PageHeader
        eyebrow="Account"
        title="Sign in"
        subtitle="Continue to Passport to open or return to your Abraxas account."
      />
      <AccountAccessFirstPaint compact />
      <div style={{ display: "flex", justifyContent: "center", marginTop: "0.5rem" }}>
        <Btn href="/passport" size="lg">Continue to Passport</Btn>
      </div>
    </RedesignPage>
  );
}
