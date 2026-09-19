import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { JUDGE_DEMO_OAUTH_CALLBACK, JUDGE_DEMO_VISIBLE_PATHS } from "@/lib/judgeDemo/contract";

export const dynamic = "force-dynamic";

const ROUTE_COPY: Record<string, string> = {
  "/": "Homepage, public sandbox product surface",
  "/passport": "Passport, zkLogin holder path on the stable demo origin",
  "/good-trouble": "Good Trouble sandbox partner demo",
  "/docs/partner-flow": "Partner Flow docs",
  "/docs/policy-packs": "Policy packs",
  "/docs/integration-kit": "Integration kit",
  "/developers/launchpad": "Launchpad, sandbox credentials and DEMO settlement evidence",
  "/docs/circle-arc-testnet": "Arc testnet settlement evidence (display only)",
  "/judge-demo": "This index",
  "/api/judge-demo/environment": "Server-derived environment identity (no credentials)",
};

export default function JudgeDemoIndexPage() {
  const judgeMode = process.env.NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO?.trim() === "true";

  return (
    <RedesignPage accent="developer" maxWidth={720}>
      <PageHeader
        eyebrow="Public Judge Demo · sandbox / DEMO only"
        title="Abraxas Judge Demo"
        subtitle="demo.abraxasworld.xyz is the public judge surface on the demo environment that tracks main, using DEMO data only. abraxasworld.xyz is the public product. Git Preview aliases remain engineering-only. Circle transfers are disabled here."
      />
      {!judgeMode && (
        <ContentCard title="Runtime flags not enabled">
          <p>
            Operators must set both <code>ABRAXAS_JUDGE_DEMO=true</code> and{" "}
            <code>NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO=true</code> on the Vercel custom environment{" "}
            <code>demo</code> after that environment has deployed <code>main</code>. Never retarget{" "}
            <code>demo</code> to a feature branch. See <code>docs/demo/JUDGE_DEMO_DEPLOYMENT.md</code>.
          </p>
        </ContentCard>
      )}
      <ContentCard title="Google OAuth callback">
        <p>One URI: {JUDGE_DEMO_OAUTH_CALLBACK}</p>
      </ContentCard>
      <ContentCard title="Judge-visible routes">
        <ul>
          {JUDGE_DEMO_VISIBLE_PATHS.map((path) => (
            <li key={path}>
              <Link href={path}>{path}</Link>
              {": "}
              {ROUTE_COPY[path] ?? "Judge-visible sandbox route"}
            </li>
          ))}
        </ul>
      </ContentCard>
    </RedesignPage>
  );
}
