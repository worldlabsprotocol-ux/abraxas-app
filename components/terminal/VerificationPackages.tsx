"use client";
// FILE: components/terminal/VerificationPackages.tsx
// Optional trust upgrades — not login gates.

import Link from "next/link";
import { S, M, G, BDR } from "./tokens";
import { MotionCard } from "@/lib/motion/MotionCard";
import { consumerCopy } from "@/lib/consumerCopy";

const PACKAGES = [
  {
    name: "Free account",
    price: "Free",
    desc: consumerCopy.packages.walletPackage,
    color: G,
    live: true,
    status: "Live",
    href: "/passport",
  },
  {
    name: "ID verification",
    price: "$29",
    desc: consumerCopy.packages.identityPackage,
    color: G,
    live: true,
    status: "Optional",
    href: "/passport#identity-stamp",
  },
  {
    name: "Business verification",
    price: "$199",
    desc: "Entity validation, beneficial ownership, operating docs. For business asset submission.",
    color: "#3B82F6",
    live: false,
    status: "Manual review",
    href: "/passport",
  },
  {
    name: "Property attestation",
    price: "$499",
    desc: "Title chain, deed review, appraisal support. Per verified property asset.",
    color: "#F59E0B",
    live: false,
    status: "Manual review",
    href: "/build",
  },
  {
    name: "Royalty attestation",
    price: "$499",
    desc: "Publishing rights, catalog ownership, royalty statements. Per music or IP asset.",
    color: "#8B5CF6",
    live: false,
    status: "Manual review",
    href: "/music-audit",
  },
  {
    name: "Enterprise bundle",
    price: "Custom",
    desc: "Real estate, mineral rights, film IP, private businesses. White-glove review.",
    color: G,
    live: false,
    status: "Contact",
    href: "/partners",
  },
];

export function VerificationPackages() {
  return (
    <div>
      <div style={{ fontFamily: S, fontSize: "0.95rem", fontWeight: 700,
                     color: "var(--text-primary)", marginBottom: "0.375rem" }}>
        Trust upgrades (optional)
      </div>
      <p style={{ fontFamily: S, fontSize: "0.78rem", color: "var(--text-secondary)",
                   lineHeight: 1.65, marginBottom: "1.25rem", maxWidth: 620 }}>
        {consumerCopy.packages.intro}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
                     gap: "0.75rem" }}>
        {PACKAGES.map(p => (
          <Link key={p.name} href={p.href} style={{ textDecoration: "none", color: "inherit" }}>
            <MotionCard glowColor={`${p.color}40`}
              style={{ padding: "0.875rem", borderRadius: 10, height: "100%",
                       border: `1px solid ${BDR}`, background: "var(--surface-raised)" }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                             alignItems: "flex-start", marginBottom: "0.4rem" }}>
                <span style={{ fontFamily: S, fontSize: "0.82rem", fontWeight: 700,
                                color: "var(--text-primary)" }}>{p.name}</span>
                <span style={{ fontFamily: M, fontSize: "0.48rem", fontWeight: 700,
                                color: p.live ? G : "#F59E0B",
                                background: p.live ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                                padding: "0.1rem 0.4rem", borderRadius: 8,
                                border: p.live ? "none" : "1px solid rgba(245,158,11,0.25)" }}>
                  {p.status}
                </span>
              </div>
              <div style={{ fontFamily: M, fontSize: "1.1rem", fontWeight: 800,
                             color: p.color, marginBottom: "0.3rem" }}>
                {p.price}
              </div>
              <div style={{ fontFamily: S, fontSize: "0.72rem",
                             color: "var(--text-muted)", lineHeight: 1.5 }}>
                {p.desc}
              </div>
            </MotionCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
