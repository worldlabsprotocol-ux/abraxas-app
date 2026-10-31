"use client";
// FILE: app/pricing/page.tsx
// Public partner pricing — sandbox, production, enterprise.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { AbxCard } from "@/components/design/AbxPrimitives";
import { AbxInnerPage } from "@/components/design/AbxInnerPage";
import { Btn } from "@/components/redesign/ui";
import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import {
  PUBLIC_PRICING_EYEBROW,
  PUBLIC_PRICING_FAQ,
  PUBLIC_PRICING_HEADLINE,
  PUBLIC_PRICING_LEAD,
  PUBLIC_PRICING_TIERS,
  PUBLIC_PRODUCTION_PLAN_DISPLAYS,
} from "@/lib/product/publicPricingCopy";

const FONT = ABX_FONT_SANS;

export default function PricingPage() {
  return (
    <RedesignPage maxWidth={980} accent="developer">
      <AbxInnerPage
        accent="developer"
        eyebrow={PUBLIC_PRICING_EYEBROW}
        title={PUBLIC_PRICING_HEADLINE}
        lead={PUBLIC_PRICING_LEAD}
        align="center"
        maxWidth={820}
      >
        <div
          className="public-pricing-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
            gap: "0.85rem",
          }}
        >
          {PUBLIC_PRICING_TIERS.map((tier) => (
            <AbxCard
              key={tier.id}
              accent={tier.id === "enterprise" ? "partner" : "developer"}
              style={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <p
                style={{
                  margin: "0 0 0.35rem",
                  fontFamily: FONT,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "var(--abx-accent)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {tier.title}
              </p>
              <p
                style={{
                  margin: "0 0 0.2rem",
                  fontFamily: FONT,
                  fontSize: "1.65rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                {tier.priceLabel}
              </p>
              {tier.priceDetail && (
                <p
                  style={{
                    margin: "0 0 0.65rem",
                    fontFamily: FONT,
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                  }}
                >
                  {tier.priceDetail}
                </p>
              )}
              <p
                style={{
                  margin: "0 0 0.75rem",
                  fontFamily: FONT,
                  fontSize: "0.86rem",
                  lineHeight: 1.55,
                  color: "var(--text-secondary)",
                }}
              >
                {tier.summary}
              </p>
              <Btn
                href={tier.ctaHref}
                variant={tier.ctaVariant}
                size="md"
                fullWidth
                ariaLabel={`${tier.ctaLabel} — ${tier.title}`}
                style={{ marginTop: "auto" }}
              >
                {tier.ctaLabel}
              </Btn>
            </AbxCard>
          ))}
        </div>

        <AbxCard accent="developer" padding="0">
          <details>
            <summary
              style={{
                padding: "1rem 1.15rem",
                color: "var(--text-primary)",
                fontFamily: FONT,
                fontSize: "0.92rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              What each plan includes
            </summary>
            <div style={{ padding: "0 1.15rem 1.15rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {PUBLIC_PRICING_TIERS.map((tier) => (
                  <section key={tier.id}>
                    <h2
                      style={{
                        margin: "0 0 0.45rem",
                        fontFamily: FONT,
                        fontSize: "0.95rem",
                        fontWeight: 800,
                        color: "var(--text-primary)",
                      }}
                    >
                      {tier.title}
                    </h2>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: "1.1rem",
                        fontFamily: FONT,
                        fontSize: "0.82rem",
                        lineHeight: 1.6,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {tier.features.map((feature) => (
                        <li key={feature.text} style={{ marginBottom: "0.35rem" }}>
                          {feature.text}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </details>
        </AbxCard>

        <AbxCard accent="developer" padding="0" id="production-plans">
          <details>
            <summary
              style={{
                padding: "1rem 1.15rem",
                color: "var(--text-primary)",
                fontFamily: FONT,
                fontSize: "0.92rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Production volumes and overage rates
            </summary>
            <div style={{ padding: "0 1.15rem 1.15rem" }}>
              <p
                style={{
                  margin: "0 0 0.85rem",
                  fontFamily: FONT,
                  fontSize: "0.86rem",
                  lineHeight: 1.6,
                  color: "var(--text-secondary)",
                }}
              >
                List pricing for reviewed production applications. Estimates are observe-only until billing collection is enabled.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {PUBLIC_PRODUCTION_PLAN_DISPLAYS.map((plan) => (
                  <section key={plan.planId}>
                    <h2
                      style={{
                        margin: "0 0 0.25rem",
                        fontFamily: FONT,
                        fontSize: "0.95rem",
                        fontWeight: 800,
                        color: "var(--text-primary)",
                      }}
                    >
                      {plan.label}
                    </h2>
                    <p
                      style={{
                        margin: "0 0 0.65rem",
                        fontFamily: FONT,
                        fontSize: "1.25rem",
                        fontWeight: 800,
                        color: "var(--text-primary)",
                      }}
                    >
                      {plan.monthlyPriceLabel}
                    </p>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: "1.1rem",
                        fontFamily: FONT,
                        fontSize: "0.8rem",
                        lineHeight: 1.55,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <li>{plan.includedReceiptsLabel}</li>
                      <li>{plan.includedApiCallsLabel}</li>
                      <li>{plan.receiptOverageLabel}</li>
                      <li>{plan.apiOverageLabel}</li>
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </details>
        </AbxCard>

        <AbxCard accent="neutral" padding="0">
          <details>
            <summary
              style={{
                padding: "1rem 1.15rem",
                color: "var(--text-primary)",
                fontFamily: FONT,
                fontSize: "0.92rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Pricing FAQs
            </summary>
            <dl style={{ margin: "0 1.15rem 1.15rem", fontFamily: FONT }}>
              {PUBLIC_PRICING_FAQ.map((item) => (
                <div key={item.question} style={{ marginBottom: "0.85rem" }}>
                  <dt
                    style={{
                      margin: "0 0 0.25rem",
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {item.question}
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      fontSize: "0.84rem",
                      lineHeight: 1.6,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        </AbxCard>
      </AbxInnerPage>
    </RedesignPage>
  );
}
