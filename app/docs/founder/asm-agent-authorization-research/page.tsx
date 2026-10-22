import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ASM & verifiable agent authorization — research",
  robots: { index: false, follow: false },
};

export default function AsmAgentAuthorizationResearchPage() {
  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "2rem 1.25rem 4rem", lineHeight: 1.6 }}>
      <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
        <Link href="/founder-brand-review">← Founder brand review</Link>
      </p>
      <h1>Altered State Machine &amp; verifiable agent authorization</h1>
      <p>Evidence-backed research note for Abraxas strategy (Oct 2026). Not product commitment.</p>

      <h2>1 · What ASM got right (public concepts)</h2>
      <ul>
        <li>
          <strong>Brain / Memory / Form split</strong> — intelligence and behavior separable from visual avatar; supports
          portability across experiences.
        </li>
        <li>
          <strong>Trainable capability layers</strong> — emphasized composable agent skills rather than monolithic chat.
        </li>
        <li>
          <strong>Environmental execution</strong> — agents acting in contexts, not only conversational widgets.
        </li>
      </ul>
      <p>
        <em>Uncertainty:</em> Detailed execution architecture and current ownership of runtime services are not verified
        here. Treat operational history as partially documented; do not infer abandonment from marketplace media gaps.
      </p>

      <h2>2 · What may not have worked (facts vs hypotheses)</h2>
      <ul>
        <li>
          <strong>Fact:</strong> Consumer NFT + token economics dominated positioning; institutional buyers were not the
          primary GTM.
        </li>
        <li>
          <strong>Hypothesis:</strong> On-chain ownership of a “brain” did not give relying parties a standard way to
          verify scoped, revocable authorization for actions.
        </li>
        <li>
          <strong>Fact:</strong> US patent activity continued (assignments reported 2025–2026); copying implementation
          details is legally risky — conceptual learning only.
        </li>
      </ul>

      <h2>3 · What changed by 2026</h2>
      <ul>
        <li>
          <strong>MCP / A2A</strong> — tool and agent interoperability; still require trust boundaries for who may invoke
          tools on whose behalf.
        </li>
        <li>
          <strong>NIST AI agent identity initiative (Feb 2026)</strong> — identity, delegation, accountability,
          provenance (emerging, not final standard).
        </li>
        <li>
          <strong>OAuth 2.0 / workload identity</strong> — established patterns for delegated access; agents should reuse
          rather than reinvent.
        </li>
        <li>
          <strong>Verifiable credentials &amp; selective disclosure</strong> — align with Abraxas receipt and policy
          model.
        </li>
      </ul>

      <h2>4 · What Abraxas already has</h2>
      <ul>
        <li>Signed decision receipts and independent verification APIs.</li>
        <li>Policy-bound partner flows with explicit holder consent (wallet-control server gate #788).</li>
        <li>Wallet-native qualification — possession ≠ blanket disclosure.</li>
        <li>Audit trail contract for partner_flow steps (`partner_flow.consent`, complete, receipt issuance).</li>
      </ul>

      <h2>5 · Genuine gaps (if pursuing agent authorization)</h2>
      <ul>
        <li>First-class <strong>software agent identity</strong> artifact (distinct from human holder / org).</li>
        <li>
          <strong>Delegation credential</strong> format: scope, expiry, revocable, verifiable without model context.
        </li>
        <li>Institutional verifier UX for “agent acted under delegation D at time T.”</li>
      </ul>

      <h2>6 · Opportunity ranking (concise)</h2>
      <ol>
        <li>
          <strong>Scoped agent delegation verification</strong> — high differentiation, medium build, aligns with core
          thesis. Integrate OAuth/W3C VC where possible.
        </li>
        <li>
          <strong>Audit/provenance for automated submissions</strong> — medium value; overlaps receipts if actions map to
          partner flows.
        </li>
        <li>
          <strong>Collectible agent avatars / NFT brains</strong> — reject for Abraxas institutional positioning.
        </li>
      </ol>

      <h2>7 · Build vs integrate</h2>
      <p>
        Prefer <strong>integrate</strong> established delegation (OAuth 2.0, SPIFFE/SPIRE for workload identity, VC
        where institutions already issue). Abraxas should issue/verify <strong>authorization decisions</strong>, not host
        models.
      </p>

      <h2>8 · Legal / IP</h2>
      <p>
        Counsel review before any ASM-adjacent visual or technical reuse. Do not ship ASM artwork, character silhouette,
        or patented claims. Operator and sphere marks in brand review are original.
      </p>

      <h2>9 · Minimal architecture sketch (top opportunity)</h2>
      <pre
        style={{
          background: "#0f141c",
          color: "#e2e8f0",
          padding: "1rem",
          borderRadius: 8,
          fontSize: "0.8rem",
          overflow: "auto",
        }}
      >
        {`Human/org ──► Abraxas policy + evidence ──► signed delegation credential (scope, exp, subject, agent_id)
Agent runtime ──► presents credential + action context ──► Relying party verifies via Abraxas (independent)
AI model ──► proposes action only; never self-asserts authorization`}
      </pre>

      <h2>10 · Recommendation</h2>
      <p>
        <strong>Research further + design partner interviews</strong> for agent delegation verification;{" "}
        <strong>do not implement</strong> autonomous agents or NFT mechanics in product until a specific institutional
        workflow is contracted. Continue brand exploration separately. Ship #788 consent gate first.
      </p>

      <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
        References to verify externally: NIST NCCoE AI agent identity materials (2026); IETF Agent Authorization Protocol
        drafts; MCP specification; OAuth 2.0 RFC 6749; Abraxas partner_flow audit contract in repo.
      </p>
    </main>
  );
}
