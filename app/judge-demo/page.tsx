import Link from "next/link";
import { JUDGE_DEMO_OAUTH_CALLBACK, JUDGE_DEMO_VISIBLE_PATHS } from "@/lib/judgeDemo/contract";

export const dynamic = "force-dynamic";

const ROUTE_COPY: Record<string, string> = {
  "/": "Homepage — public sandbox product surface",
  "/passport": "Passport — zkLogin holder path on the stable demo origin",
  "/good-trouble": "Good Trouble — sandbox age-gated partner demo",
  "/docs/partner-flow": "Partner Flow docs",
  "/docs/policy-packs": "Policy packs",
  "/docs/integration-kit": "Integration kit",
  "/developers/launchpad": "Launchpad — sandbox credentials and DEMO settlement evidence",
  "/docs/circle-arc-testnet": "Arc testnet settlement evidence (display only)",
  "/judge-demo": "This index",
  "/api/judge-demo/environment": "Server-derived environment identity (no credentials)",
};

export default function JudgeDemoIndexPage() {
  const judgeMode = process.env.NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO?.trim() === "true";

  return (
    <main style={{ maxWidth: 720, margin: "2.5rem auto", padding: "0 1.25rem", fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <p style={{ fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
        Public Judge Demo · sandbox / DEMO only
      </p>
      <h1 style={{ fontSize: "1.65rem", margin: "0.4rem 0 0.75rem" }}>Abraxas Judge Demo</h1>
      <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
        This custom domain is the public judge surface. Protected Git Preview aliases remain engineering-only
        and are never the only way to view a feature. Circle transfers and testnet fund movement are disabled here.
      </p>
      {!judgeMode && (
        <p style={{ color: "#b45309" }}>
          Runtime flags are not enabled on this deployment. Operators must set both
          {" "}
          <code>ABRAXAS_JUDGE_DEMO=true</code>
          {" "}
          and
          {" "}
          <code>NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO=true</code>
          {" "}
          on the Vercel custom environment <code>demo</code>. See
          {" "}
          <code>docs/demo/JUDGE_DEMO_DEPLOYMENT.md</code>.
        </p>
      )}
      <p style={{ fontFamily: "var(--font-mono), ui-monospace, monospace", fontSize: "0.78rem" }}>
        Google OAuth callback (one URI): {JUDGE_DEMO_OAUTH_CALLBACK}
      </p>
      <ul style={{ paddingLeft: "1.1rem", lineHeight: 1.8 }}>
        {JUDGE_DEMO_VISIBLE_PATHS.map((path) => (
          <li key={path}>
            <Link href={path}>{path}</Link>
            {" — "}
            {ROUTE_COPY[path] ?? "Judge-visible sandbox route"}
          </li>
        ))}
      </ul>
    </main>
  );
}
