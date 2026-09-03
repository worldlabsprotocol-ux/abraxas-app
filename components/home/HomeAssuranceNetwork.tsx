"use client";
// FILE: components/home/HomeAssuranceNetwork.tsx
// Assurance network product narrative — institutional, privacy-forward homepage section.

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { ELIGIBILITY_ASSURANCE_LADDER } from "@/lib/assurance/eligibilityAssurance";
import { ELIGIBILITY_POLICY_EXAMPLES } from "@/lib/assurance/eligibilityPolicyCatalog";
import { TRANSACTION_REQUIREMENT_OPTIONS } from "@/lib/assurance/transactionRequirement";
import {
  ASSURANCE_NETWORK_DISCLAIMER,
  ASSURANCE_NETWORK_EYEBROW,
  ASSURANCE_NETWORK_HEADLINE,
  ASSURANCE_NETWORK_STEPS,
  ASSURANCE_NETWORK_SUBHEAD,
  ASSURANCE_NETWORK_TRANSACTION_EYEBROW,
  ASSURANCE_NETWORK_TRANSACTION_HEADLINE,
  ASSURANCE_NETWORK_TRANSACTION_SUBHEAD,
  ASSURANCE_NETWORK_TRUST_POINTS,
  ASSURANCE_NETWORK_USE_CASES,
} from "@/lib/home/assuranceNetworkCopy";

const FONT = ABRAXAS_FONT_SANS;
const GOLD = "#E8C547";
const TEAL = "#2DD4BF";
const VIOLET = "#a78bfa";
const AMBER = "#f59e0b";

export function HomeAssuranceNetwork() {
  return (
    <section
      id="assurance-network"
      aria-labelledby="assurance-network-heading"
      className="abx-home-section-center"
      style={{ width: "100%" }}
    >
      <div className="abx-home-intro">
        <p className="abx-eyebrow-violet" style={{ marginBottom: "0.55rem" }}>
          {ASSURANCE_NETWORK_EYEBROW}
        </p>
        <h2
          id="assurance-network-heading"
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            margin: "0 0 0.75rem",
            lineHeight: 1.15,
          }}
        >
          {ASSURANCE_NETWORK_HEADLINE}
        </h2>
        <p className="abx-home-prose" style={{ maxWidth: 720, margin: "0 auto 1.5rem" }}>
          {ASSURANCE_NETWORK_SUBHEAD}
        </p>
      </div>

      <ol
        aria-label="How Abraxas assurance works"
        style={{
          listStyle: "none",
          margin: "0 auto 1.75rem",
          padding: 0,
          display: "grid",
          gap: "0.85rem",
          maxWidth: 820,
          width: "100%",
          textAlign: "left",
        }}
      >
        {ASSURANCE_NETWORK_STEPS.map((step, index) => (
          <li
            key={step.id}
            className="abx-glass-panel"
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "0.85rem",
              alignItems: "start",
              padding: "1rem 1.1rem",
              borderRadius: 14,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: "0.8rem",
                color: "#04130f",
                background: `linear-gradient(135deg, ${TEAL}, #14b8a6)`,
              }}
            >
              {index + 1}
            </span>
            <div>
              <h3 style={{ margin: "0 0 0.35rem", fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800 }}>
                {step.title}
              </h3>
              <p style={{ margin: 0, fontFamily: FONT, fontSize: "0.84rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div style={{ maxWidth: 920, width: "100%", margin: "0 auto 1.75rem" }}>
        <h3
          style={{
            fontFamily: FONT,
            fontSize: "0.95rem",
            fontWeight: 800,
            color: GOLD,
            margin: "0 0 0.85rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Eligibility evidence ladder
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.55, color: "var(--text-muted)", textAlign: "left" }}>
          How strong the underlying eligibility evidence is — not what must happen at checkout or entry.
        </p>
        <div
          role="list"
          aria-label="Eligibility assurance levels"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.65rem",
          }}
        >
          {ELIGIBILITY_ASSURANCE_LADDER.map((level, index) => (
            <div
              key={level.level}
              role="listitem"
              style={{
                padding: "0.85rem",
                borderRadius: 12,
                border: "1px solid rgba(167,139,250,0.22)",
                background: "rgba(12,14,24,0.65)",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.35rem" }}>
                {index > 0 && (
                  <span aria-hidden="true" style={{ color: VIOLET, fontSize: "0.75rem" }}>→</span>
                )}
                <strong style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-primary)" }}>
                  {level.shortLabel}
                </strong>
              </div>
              <p style={{ margin: 0, fontFamily: FONT, fontSize: "0.76rem", lineHeight: 1.55, color: "var(--text-muted)" }}>
                {level.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 920, width: "100%", margin: "0 auto 1.75rem", textAlign: "left" }}>
        <p className="abx-eyebrow-violet" style={{ marginBottom: "0.45rem" }}>
          {ASSURANCE_NETWORK_TRANSACTION_EYEBROW}
        </p>
        <h3
          style={{
            fontFamily: FONT,
            fontSize: "0.95rem",
            fontWeight: 800,
            color: AMBER,
            margin: "0 0 0.55rem",
            letterSpacing: "0.02em",
          }}
        >
          {ASSURANCE_NETWORK_TRANSACTION_HEADLINE}
        </h3>
        <p style={{ margin: "0 0 0.85rem", fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.55, color: "var(--text-muted)" }}>
          {ASSURANCE_NETWORK_TRANSACTION_SUBHEAD}
        </p>
        <div
          role="list"
          aria-label="Transaction requirement options"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.65rem",
          }}
        >
          {TRANSACTION_REQUIREMENT_OPTIONS.map((option) => (
            <div
              key={option.requirement}
              role="listitem"
              style={{
                padding: "0.85rem",
                borderRadius: 12,
                border: `1px solid ${AMBER}33`,
                background: `${AMBER}0a`,
                textAlign: "left",
              }}
            >
              <strong style={{ display: "block", fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                {option.shortLabel}
              </strong>
              <p style={{ margin: 0, fontFamily: FONT, fontSize: "0.76rem", lineHeight: 1.55, color: "var(--text-muted)" }}>
                {option.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="abx-glass-panel"
        aria-label="Assurance flow diagram"
        style={{
          maxWidth: 920,
          width: "100%",
          margin: "0 auto 1.75rem",
          padding: "1.1rem",
          borderRadius: 14,
          textAlign: "left",
        }}
      >
        <p style={{ margin: "0 0 0.65rem", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: TEAL }}>
          Trust flow
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.45rem",
            alignItems: "center",
            fontFamily: FONT,
            fontSize: "0.76rem",
            color: "var(--text-secondary)",
          }}
        >
          {[
            "Authoritative issuer",
            "Abraxas reusable credential",
            "Partner policy evaluation",
            "Partner-bound receipt",
            "Merchant decision",
          ].map((label, index, arr) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ padding: "0.3rem 0.55rem", borderRadius: 999, border: `1px solid ${GOLD}44`, background: `${GOLD}12` }}>
                {label}
              </span>
              {index < arr.length - 1 && <span aria-hidden="true" style={{ color: VIOLET }}>→</span>}
            </span>
          ))}
        </div>
        <p style={{ margin: "0.65rem 0 0", fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
          Merchants receive pass/fail outcomes, assurance metadata, and any transaction obligation — not raw identity evidence.
        </p>
      </div>

      <div style={{ maxWidth: 920, width: "100%", margin: "0 auto 1.5rem" }}>
        <h3 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.75rem" }}>
          Use cases
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.65rem",
            textAlign: "left",
          }}
        >
          {ASSURANCE_NETWORK_USE_CASES.map((item) => (
            <article
              key={item.id}
              style={{
                padding: "0.85rem",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <h4 style={{ margin: "0 0 0.35rem", fontFamily: FONT, fontSize: "0.84rem", fontWeight: 800 }}>
                {item.title}
              </h4>
              <p style={{ margin: 0, fontFamily: FONT, fontSize: "0.76rem", lineHeight: 1.55, color: "var(--text-muted)" }}>
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>

      <aside
        aria-label="Example policy identifiers"
        style={{
          maxWidth: 920,
          width: "100%",
          margin: "0 auto 1.25rem",
          padding: "0.9rem 1rem",
          borderRadius: 12,
          border: "1px solid rgba(232,197,71,0.22)",
          background: "rgba(232,197,71,0.06)",
          textAlign: "left",
        }}
      >
        <p style={{ margin: "0 0 0.5rem", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: GOLD }}>
          Example policy identifiers (architecture illustration)
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.74rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
          {ELIGIBILITY_POLICY_EXAMPLES.slice(0, 4).map((policy) => (
            <li key={policy.policy_id}>
              <code style={{ color: VIOLET }}>{policy.policy_id}</code>
              {" — "}
              {policy.summary}
            </li>
          ))}
        </ul>
      </aside>

      <ul
        style={{
          maxWidth: 720,
          margin: "0 auto 1rem",
          paddingLeft: "1.1rem",
          textAlign: "left",
          fontFamily: FONT,
          fontSize: "0.8rem",
          lineHeight: 1.65,
          color: "var(--text-secondary)",
        }}
      >
        {ASSURANCE_NETWORK_TRUST_POINTS.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <p
        style={{
          maxWidth: 720,
          margin: "0 auto",
          fontFamily: FONT,
          fontSize: "0.74rem",
          lineHeight: 1.6,
          color: "var(--text-muted)",
        }}
      >
        {ASSURANCE_NETWORK_DISCLAIMER}
      </p>
    </section>
  );
}
