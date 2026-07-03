"use client";
// FILE: components/redesign/OnboardingChoiceSection.tsx
// Web2-style "what do you want to do" — browse without sign-in (Coinbase/Binance pattern).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { consumerCopy } from "@/lib/consumerCopy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";
const BLUE = "#3B82F6";
const AMBER = "#F59E0B";

const PATHS = [
  {
    id: "invest",
    color: ACCENT,
    title: "Book or invest",
    desc: "Reserve Cielo Sunrise or put stablecoin into a verified asset.",
    steps: ["Pick dates or an asset", "Sign in with Google", "Pay — ID check only if required"],
    href: "/flagship",
  },
  {
    id: "submit",
    color: BLUE,
    title: "Get my asset verified",
    desc: "Real estate, music catalog, mineral rights, or a business — we verify it once.",
    steps: ["Tell us what it is", "Our team reviews it", "It becomes investable"],
    href: "/build",
  },
  {
    id: "look",
    color: AMBER,
    title: "Just look around",
    desc: "See what's already verified before deciding anything.",
    steps: ["Browse the marketplace", "No sign-in required", "Come back anytime"],
    href: "#assets",
  },
];

export function OnboardingChoiceSection() {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  function go(id: string, href: string) {
    if (id === "look" && href.startsWith("#")) {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    router.push(href);
  }

  return (
    <section>
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.05,
          color: "var(--text-primary)", margin: "0 0 0.5rem",
        }}>
          {consumerCopy.onboarding.title}
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "var(--fs-body)", color: "var(--text-secondary)",
          lineHeight: 1.7, margin: 0,
        }}>
          {consumerCopy.onboarding.subtitle}
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "0.875rem",
      }}>
        {PATHS.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => go(p.id, p.href)}
            onMouseEnter={() => setHovered(p.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              textAlign: "left",
              padding: "1.125rem",
              borderRadius: 16,
              border: hovered === p.id ? `1.5px solid ${p.color}` : "1px solid var(--border)",
              background: hovered === p.id ? `${p.color}0D` : "var(--surface-raised)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <div style={{
              fontFamily: FONT, fontSize: "0.95rem", fontWeight: 700,
              color: "var(--text-primary)", marginBottom: "0.5rem",
            }}>
              {p.title}
            </div>
            <div style={{
              fontFamily: FONT, fontSize: "0.78rem",
              color: "var(--text-secondary)", lineHeight: 1.6,
              marginBottom: "0.875rem",
            }}>
              {p.desc}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {p.steps.map((step, i) => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{
                    fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
                    color: p.color, width: 14,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
