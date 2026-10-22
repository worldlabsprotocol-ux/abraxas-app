"use client";

import Link from "next/link";
import { AbraxasLogo } from "@/components/brand/AbraxasLogo";
import {
  AbraxasExplorationLockup,
  AbraxasExplorationMark,
} from "@/components/brand/exploration/AbraxasExplorationMark";
import { AbraxasOperatorExploration } from "@/components/brand/exploration/AbraxasOperatorExploration";
import {
  BRAND_DIRECTIONS,
  EXISTING_BRAND_AUDIT,
  OPERATOR_DIRECTIONS,
  RECOMMENDED_BRAND_DIRECTION,
  RECOMMENDED_OPERATOR_DIRECTION,
} from "@/lib/brand/exploration/brandExplorationMeta";

function MockNav({ exploration }: { exploration: boolean }) {
  return (
    <div className="abx-founder-brand-review__mock-nav">
      {exploration ? (
        <AbraxasExplorationLockup direction={RECOMMENDED_BRAND_DIRECTION} emblemSize={28} />
      ) : (
        <AbraxasLogo emblemSize={28} href={undefined} />
      )}
      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Passport · Studio</span>
    </div>
  );
}

export function FounderBrandReviewClient() {
  return (
    <div className="abx-founder-brand-review">
      <div className="abx-founder-brand-review__banner" role="status">
        Internal founder review — does not replace production branding. Production emblem remains{" "}
        <code>/brand/official/abraxas-emblem-protocol.png</code>. PR #788 consent security is independent of this
        surface.
      </div>

      <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>Living Protocol identity exploration</p>
      <h1>Abraxas brand system — controlled evolution</h1>
      <p style={{ maxWidth: 720 }}>
        Three protocol mark directions, a two-level mark system (permanent + living), and three Operator concepts — paired
        with an ASM / agent-authorization research summary. Recommended pairing:{" "}
        <strong style={{ color: "#e2e8f0" }}>Living Protocol</strong> +{" "}
        <strong style={{ color: "#e2e8f0" }}>Protocol Entity</strong>.
      </p>

      <h2>1 · Existing identity audit</h2>
      <div className="abx-founder-brand-review__card">
        <ul>
          <li>
            <strong style={{ color: "#e2e8f0" }}>Primary mark:</strong> {EXISTING_BRAND_AUDIT.primaryMark}
          </li>
          <li>
            <strong style={{ color: "#e2e8f0" }}>Accent:</strong> {EXISTING_BRAND_AUDIT.uiAccent}
          </li>
          <li>
            <strong style={{ color: "#e2e8f0" }}>Wordmark:</strong> {EXISTING_BRAND_AUDIT.wordmark}
          </li>
          <li>
            <strong style={{ color: "#e2e8f0" }}>Nav:</strong> {EXISTING_BRAND_AUDIT.navUsage}
          </li>
        </ul>
        <p>
          <strong style={{ color: "#e2e8f0" }}>Preserve:</strong> {EXISTING_BRAND_AUDIT.preserve.join(" · ")}
        </p>
      </div>

      <h2>2 · Protocol mark directions (equal presentation)</h2>
      <div className="abx-founder-brand-review__grid">
        {BRAND_DIRECTIONS.map((dir) => (
          <div
            key={dir.id}
            className={`abx-founder-brand-review__card${dir.id === RECOMMENDED_BRAND_DIRECTION ? " abx-founder-brand-review__card--recommended" : ""}`}
          >
            {dir.id === RECOMMENDED_BRAND_DIRECTION ? (
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: "#4cbb92" }}>Recommended</p>
            ) : null}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem" }}>
              <AbraxasExplorationMark direction={dir.id} level="permanent" size={72} />
            </div>
            <h3 style={{ margin: "0 0 0.35rem", fontSize: "1rem", color: "#e2e8f0" }}>{dir.title}</h3>
            <p style={{ margin: 0 }}>{dir.metaphor}</p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
              <strong>Continuity:</strong> {dir.continuity}
            </p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
              <strong>Risks:</strong> {dir.risks}
            </p>
          </div>
        ))}
      </div>

      <h2>3 · Two-level system (recommended direction)</h2>
      <div className="abx-founder-brand-review__grid">
        <div className="abx-founder-brand-review__card">
          <h3 style={{ marginTop: 0, color: "#e2e8f0" }}>Level 1 — Permanent mark</h3>
          <AbraxasExplorationLockup direction={RECOMMENDED_BRAND_DIRECTION} emblemSize={48} />
          <div className="abx-founder-brand-review__scale-row" style={{ marginTop: "1rem" }}>
            {[16, 24, 32, 64].map((s) => (
              <div key={s} style={{ textAlign: "center" }}>
                <AbraxasExplorationMark direction={RECOMMENDED_BRAND_DIRECTION} size={s} />
                <div style={{ fontSize: "0.7rem", marginTop: 4 }}>{s}px</div>
              </div>
            ))}
          </div>
        </div>
        <div className="abx-founder-brand-review__card">
          <h3 style={{ marginTop: 0, color: "#e2e8f0" }}>Level 2 — Living object (hero / motion)</h3>
          <div style={{ display: "flex", justifyContent: "center", padding: "0.5rem 0" }}>
            <AbraxasExplorationMark direction={RECOMMENDED_BRAND_DIRECTION} level="living" size={160} />
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem" }}>
            Same silhouette as Level 1 — accent spectrum only inside the trust shell. Static fallback shown here; motion
            would subtle-rotate filaments under <code>prefers-reduced-motion</code> respect.
          </p>
        </div>
      </div>

      <h2>4 · Variants</h2>
      <div className="abx-founder-brand-review__grid">
        <div className="abx-founder-brand-review__card">
          <p style={{ margin: "0 0 0.5rem" }}>Dark</p>
          <AbraxasExplorationLockup direction={RECOMMENDED_BRAND_DIRECTION} variant="dark" />
        </div>
        <div className="abx-founder-brand-review__light-panel">
          <p style={{ margin: "0 0 0.5rem", color: "#334155" }}>Light</p>
          <AbraxasExplorationLockup direction={RECOMMENDED_BRAND_DIRECTION} variant="light" />
        </div>
        <div className="abx-founder-brand-review__card">
          <p style={{ margin: "0 0 0.5rem" }}>Monochrome</p>
          <AbraxasExplorationLockup direction={RECOMMENDED_BRAND_DIRECTION} variant="mono" />
        </div>
      </div>

      <h2>5 · Product mockups (exploration lockup)</h2>
      <div className="abx-founder-brand-review__grid">
        <div className="abx-founder-brand-review__mock">
          <MockNav exploration />
          <div className="abx-founder-brand-review__mock-body">Public navigation — emblem + ABRAXAS at 28px.</div>
        </div>
        <div className="abx-founder-brand-review__mock">
          <MockNav exploration={false} />
          <div className="abx-founder-brand-review__mock-body">Current production lockup (comparison).</div>
        </div>
        <div className="abx-founder-brand-review__mock">
          <div className="abx-founder-brand-review__mock-body" style={{ borderBottom: "1px solid rgba(148,163,184,0.15)", paddingBottom: "0.75rem" }}>
            Holder verification
          </div>
          <div className="abx-founder-brand-review__mock-body">
            <AbraxasExplorationMark direction={RECOMMENDED_BRAND_DIRECTION} size={32} />
            <p style={{ margin: "0.75rem 0 0" }}>
              Review → Verify wallet → Approve sharing → Complete. Mark anchors trust; consent remains explicit and
              server-gated (#788).
            </p>
          </div>
        </div>
        <div className="abx-founder-brand-review__mock">
          <div className="abx-founder-brand-review__mock-body">
            <strong style={{ color: "#e2e8f0" }}>Integration Studio</strong>
            <p style={{ margin: "0.5rem 0" }}>
              Contextual Operator panel (optional) explains sandbox keys — never signs or approves consent.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <AbraxasOperatorExploration direction={RECOMMENDED_OPERATOR_DIRECTION} size={72} />
              <p style={{ margin: 0, fontSize: "0.8rem" }}>
                “Your policy is pinned. Next: run sandbox qualification, then request holder verification.”
              </p>
            </div>
          </div>
        </div>
      </div>

      <h2>6 · Operator directions</h2>
      <div className="abx-founder-brand-review__grid">
        {OPERATOR_DIRECTIONS.map((op) => (
          <div
            key={op.id}
            className={`abx-founder-brand-review__card${op.id === RECOMMENDED_OPERATOR_DIRECTION ? " abx-founder-brand-review__card--recommended" : ""}`}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
              <AbraxasOperatorExploration direction={op.id} size={100} />
            </div>
            <h3 style={{ margin: "0 0 0.35rem", fontSize: "1rem", color: "#e2e8f0" }}>{op.title}</h3>
            <p style={{ margin: 0, fontSize: "0.85rem" }}>{op.role}</p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
              <strong>Brand link:</strong> {op.brandLink}
            </p>
          </div>
        ))}
      </div>

      <h2>7 · ASM &amp; verifiable agent authorization (summary)</h2>
      <div className="abx-founder-brand-review__card">
        <p>
          Full report:{" "}
          <Link href="/docs/founder/asm-agent-authorization-research" style={{ color: "#4cbb92" }}>
            docs/founder/asm-agent-authorization-research
          </Link>
        </p>
        <ul>
          <li>
            <strong style={{ color: "#e2e8f0" }}>ASM insight:</strong> Separating intelligence (Brain), memory, and
            presentation (Form) anticipated portable agents — but NFT ownership ≠ authorization.
          </li>
          <li>
            <strong style={{ color: "#e2e8f0" }}>2026 shift:</strong> NIST and IETF drafts focus on agent identity,
            scoped delegation, and keeping credentials out of model context — not collectible avatars.
          </li>
          <li>
            <strong style={{ color: "#e2e8f0" }}>Abraxas fit:</strong> Signed decisions, policy evaluation, wallet-native
            consent, and independent verification already enforce “AI proposes, protocol authorizes.”
          </li>
          <li>
            <strong style={{ color: "#e2e8f0" }}>Recommendation:</strong> Research further; do not build NFT agents. Highest
            opportunity: narrowly scoped, verifiable delegation credentials for software agents (integrate OAuth / VC /
            workload identity where established).
          </li>
        </ul>
      </div>

      <h2>8 · Founder sign-off</h2>
      <ul>
        <li>Select protocol mark direction (default recommendation: Living Protocol).</li>
        <li>Approve Level 1 geometry before any production swap.</li>
        <li>Decide whether Operator ships in v1 (recommend: contextual help only, post-#788).</li>
        <li>Confirm ASM research phase → pilot vs defer (see research doc).</li>
      </ul>
    </div>
  );
}
