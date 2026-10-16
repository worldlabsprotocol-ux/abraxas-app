"use client";
// FILE: components/developers/DevelopersDiscoveryPills.tsx
// Reference C — productized developer discovery with pill filters.

import Link from "next/link";
import { useMemo, useState } from "react";

const CATEGORIES = [
  { id: "integrate", label: "Integrate" },
  { id: "sdk", label: "Institutional SDK" },
  { id: "trust", label: "Trust material" },
  { id: "receipts", label: "Signed receipts" },
  { id: "protocol", label: "Protocol" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

const CARDS: Array<{
  id: string;
  category: CategoryId;
  title: string;
  detail: string;
  href: string;
  tag: string;
}> = [
  {
    id: "studio",
    category: "integrate",
    title: "Integration Studio",
    detail: "Outcome-based sandbox apps, policy fit, and starter kits.",
    href: "/developers/integration-studio",
    tag: "Sandbox",
  },
  {
    id: "launchpad",
    category: "integrate",
    title: "Partner Launchpad",
    detail: "Credentials, hosted verification, and integration health.",
    href: "/developers/launchpad",
    tag: "Operations",
  },
  {
    id: "institutional-workspace",
    category: "integrate",
    title: "Institutional integration workspace",
    detail: "Sandbox app binding, SDK delivery, and first verified outcome.",
    href: "/developers/institutional-integration",
    tag: "Build #591",
  },
  {
    id: "sdk",
    category: "sdk",
    title: "Institutional verification SDK",
    detail: "Offline receipt cryptography and replay guards.",
    href: "/developers/institutional-verification",
    tag: "Build #587",
  },
  {
    id: "keys",
    category: "trust",
    title: "Receipt verification keys",
    detail: "Public issuer material and digest v2 pinning.",
    href: "/api/receipts/verification-keys",
    tag: "Trust",
  },
  {
    id: "contract",
    category: "trust",
    title: "Verification contract",
    detail: "Versioned institutional trust capabilities JSON.",
    href: "/api/trust/verification-contract/v1",
    tag: "Contract",
  },
  {
    id: "verify",
    category: "receipts",
    title: "Record verifier",
    detail: "Inspect signed decision receipts with explicit states.",
    href: "/verify?mode=receipt",
    tag: "Verify",
  },
  {
    id: "rp",
    category: "protocol",
    title: "External relying-party guide",
    detail: "Server-side verification patterns and error codes.",
    href: "/docs/relying-party-verify",
    tag: "Docs",
  },
];

export function DevelopersDiscoveryPills() {
  const [active, setActive] = useState<CategoryId>("integrate");
  const visible = useMemo(() => CARDS.filter((c) => c.category === active), [active]);

  return (
    <section className="abx-dev-discovery" aria-label="Developer product discovery">
      <div className="abx-dev-discovery__pills" role="tablist" aria-label="Developer categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={active === cat.id}
            className={`abx-dev-discovery__pill${active === cat.id ? " abx-dev-discovery__pill--active" : ""}`}
            onClick={() => setActive(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="abx-dev-discovery__grid" role="tabpanel">
        {visible.map((card) => (
          <Link key={card.id} href={card.href} className="abx-dev-discovery__card">
            <span className="abx-dev-discovery__tag">{card.tag}</span>
            <h3 className="abx-dev-discovery__card-title">{card.title}</h3>
            <p className="abx-dev-discovery__card-detail">{card.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
