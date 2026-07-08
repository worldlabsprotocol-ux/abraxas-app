import { Suspense } from "react";
import { RedesignShell } from "@/components/redesign/RedesignShell";
import { VerifyPageIntro } from "@/components/verify/VerifyPageIntro";
import { VerifyStaticSample } from "@/components/verify/VerifyStaticSample";
import { VerifyClient } from "./VerifyClient";

export default function VerifyPage() {
  return (
    <RedesignShell>
      <VerifyPageIntro />
      <VerifyStaticSample />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(1rem, 3vw, 2rem) clamp(2rem, 6vw, 4rem)" }}>
        <Suspense fallback={
          <p style={{ fontFamily: "'Inter',system-ui,sans-serif", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Loading verifier…
          </p>
        }>
          <VerifyClient />
        </Suspense>
      </div>
    </RedesignShell>
  );
}
