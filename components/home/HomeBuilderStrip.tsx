// FILE: components/home/HomeBuilderStrip.tsx
// Developer path — one code sample, read docs link.

import Link from "next/link";
import { siteUrl } from "@/lib/siteUrl";

const CODE_SAMPLE = `curl -s -X POST ${siteUrl("/api/credentials/verify")} \\
  -H "Authorization: Bearer $ABX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"record_id":"ABX-RE-HOSP-001","policy_id":"cielo-guest-v1"}'`;

export function HomeBuilderStrip() {
  return (
    <section aria-labelledby="builder-heading" className="pr-section pr-section-border">
      <span className="pr-label">For developers</span>
      <h2 id="builder-heading" className="pr-h2">Embed Passport — don&apos;t rebuild KYC</h2>
      <p className="pr-body">
        npm install → API key → embed verify in your app. Built for humans and agents — predictable JSON responses, no UI required.
      </p>
      <ol className="pr-dev-steps">
        <li><code>npm install @abraxas/verify-client</code></li>
        <li>Issue an <code>abx_live_</code> API key from the partner console</li>
        <li>POST verify — decision + proof in the response</li>
      </ol>
      <pre className="pr-code-block"><code>{CODE_SAMPLE}</code></pre>
      <Link href="/docs" className="pr-text-link">Read docs →</Link>
    </section>
  );
}
