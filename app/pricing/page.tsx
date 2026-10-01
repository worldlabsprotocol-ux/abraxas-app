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
            <AbxCard key={tier.id} accent={tier.id === "enterprise" ? "partner" : "developer"}>
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
              <ul
                style={{
                  margin: "0 0 1rem",
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
              <Btn
                href={tier.ctaHref}
                variant={tier.ctaVariant}
                size="md"
                fullWidth
                ariaLabel={`${tier.ctaLabel} — ${tier.title}`}
              >
                {tier.ctaLabel}
              </Btn>
            </AbxCard>
          ))}
        </div>

        <AbxCard accent="developer" id="production-plans">
          <h2
            style={{
              margin: "0 0 0.35rem",
              fontFamily: FONT,
              fontSize: "var(--fs-h2)",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Production plan details
          </h2>
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
              gap: "0.75rem",
            }}
          >
            {PUBLIC_PRODUCTION_PLAN_DISPLAYS.map((plan) => (
              <div
                key={plan.planId}
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: "0.95rem 1rem",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 0.25rem",
                    fontFamily: FONT,
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  {plan.label}
                </h3>
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
              </div>
            ))}
          </div>
        </AbxCard>

        <AbxCard accent="neutral">
          <h2
            style={{
              margin: "0 0 0.75rem",
              fontFamily: FONT,
              fontSize: "var(--fs-h2)",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            FAQ
          </h2>
          <dl style={{ margin: 0, fontFamily: FONT }}>
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
        </AbxCard>
      </AbxInnerPage>
    </RedesignPage>
  );
}
