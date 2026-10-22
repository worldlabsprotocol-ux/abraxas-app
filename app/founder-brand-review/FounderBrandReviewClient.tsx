"use client";

import Link from "next/link";
import Image from "next/image";
import { AbraxasLogo } from "@/components/brand/AbraxasLogo";
import { OFFICIAL_BRAND_ASSETS } from "@/lib/brand/officialBrandAssets";
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

      <h2>5 · Official vs Living Protocol (visual sign-off grid)</h2>
      <p style={{ maxWidth: 720 }}>
        Founder approved Direction B for deeper exploration — not production replacement. Compare at identical pixel
        heights; exported SVG candidates live under <code>/brand/exploration/</code>.
      </p>
      <div className="abx-founder-brand-review__card">
        <div className="abx-founder-brand-review__scale-row" style={{ alignItems: "center" }}>
          {[16, 32, 48].map((px) => (
            <div key={px} style={{ textAlign: "center", minWidth: 100 }}>
              <p style={{ margin: "0 0 0.35rem", fontSize: "0.75rem" }}>{px}px emblem</p>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center", alignItems: "center" }}>
                <div>
                  <Image
                    src={OFFICIAL_BRAND_ASSETS.emblem.src}
                    alt="Official production emblem"
                    width={px}
                    height={px}
                    style={{ height: px, width: "auto", objectFit: "contain" }}
                  />
                  <div style={{ fontSize: "0.65rem", marginTop: 4, color: "#64748b" }}>Production</div>
                </div>
                <div>
                  <AbraxasExplorationMark direction={RECOMMENDED_BRAND_DIRECTION} size={px} />
                  <div style={{ fontSize: "0.65rem", marginTop: 4, color: "#4cbb92" }}>Living Protocol</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "1.25rem", display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem" }}>Wordmark lockup (dark)</p>
            <AbraxasLogo emblemSize={32} href={undefined} />
            <div style={{ height: 12 }} />
            <AbraxasExplorationLockup direction={RECOMMENDED_BRAND_DIRECTION} emblemSize={32} />
          </div>
          <div className="abx-founder-brand-review__light-panel">
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", color: "#334155" }}>Wordmark lockup (light)</p>
            <AbraxasExplorationLockup direction={RECOMMENDED_BRAND_DIRECTION} emblemSize={32} variant="light" />
          </div>
          <div style={{ background: "#111827", padding: "1rem", borderRadius: 12 }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem" }}>Monochrome</p>
            <AbraxasExplorationLockup direction={RECOMMENDED_BRAND_DIRECTION} emblemSize={32} variant="mono" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/exploration/living-protocol-mark-mono.svg"
              alt="Living Protocol mono SVG export"
              width={64}
              height={64}
              style={{ marginTop: 12, display: "block" }}
            />
          </div>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem" }}>Level 2 dimensional comparison</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "center", justifyContent: "center" }}>
            <Image
              src={OFFICIAL_BRAND_ASSETS.emblem.src}
              alt="Official emblem at hero scale"
              width={160}
              height={160}
              style={{ height: 160, width: "auto", objectFit: "contain", opacity: 0.95 }}
            />
            <AbraxasExplorationMark direction={RECOMMENDED_BRAND_DIRECTION} level="living" size={160} />
          </div>
        </div>
      </div>

      <h2>6 · Product mockups (exploration lockup)</h2>
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

      <h2>7 · Operator directions</h2>
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

      <h2>8 · ASM &amp; verifiable agent authorization (summary)</h2>
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

      <h2>9 · Recorded founder decisions</h2>
      <ul>
        <li>
          <strong style={{ color: "#e2e8f0" }}>Living Protocol:</strong> Approved for refinement and favicon exports —
          pending final artwork sign-off before any production swap.
        </li>
        <li>
          <strong style={{ color: "#e2e8f0" }}>Protocol Entity:</strong> Preferred Operator concept; optional contextual
          guide only — no autonomous permissions or default AI provider.
        </li>
        <li>
          <strong style={{ color: "#e2e8f0" }}>Agent delegation:</strong> Research and design-partner discovery only until
          a credible institutional workflow exists.
        </li>
        <li>
          <strong style={{ color: "#e2e8f0" }}>#788 consent gate:</strong> Merged; see{" "}
          <Link href="/docs/founder/partner-sharing-consent-server-gate" style={{ color: "#4cbb92" }}>
            server gate limitations
          </Link>
          .
        </li>
      </ul>
    </div>
  );
}
