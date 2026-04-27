"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { useToast } from "@/lib/toastState";
import { useAuth } from "@/lib/authState";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

const PRICE_USDC = 5500;

const tiers = [
  {
    name: "Formation",
    price: 2500,
    desc: "Legal entity + on-chain wrapper + treasury wallet",
    features: ["Wyoming DAO LLC or Marshall Islands DAO LLC", "On-chain cap table", "Treasury wallet setup", "Abraxas vault access"],
  },
  {
    name: "Operated Formation",
    price: 5500,
    desc: "Full formation + agent vault + treasury management activated",
    features: ["Everything in Formation", "Vault deployed on day one", "Execution agent assigned", "Treasury routed through Abraxas"],
    featured: true,
  },
  {
    name: "Custom Structure",
    price: null,
    desc: "Multi-entity, complex structures, or custom jurisdictions",
    features: ["Custom jurisdiction selection", "Multi-founder structures", "Custom share allocation", "Dedicated agent configuration"],
  },
];

export default function FormationsPage() {
  const { showToast } = useToast();
  const { walletConnected } = useAuth();
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState(1);

  const handleBegin = () => {
    // Wallet is checked again on /formations/begin — but we route there
    // either way so users see the full form.
    router.push("/formations/begin");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-10">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-abraxas-subtle mb-2">
          Abraxas Formations
        </p>
        <h1 className="font-display font-bold text-3xl md:text-4xl mb-3">
          Form your entity.<br />
          <span className="text-gold">Operate it from day one.</span>
        </h1>
        <p className="text-sm text-abraxas-muted max-w-lg leading-relaxed">
          Form a legal entity, get an on-chain wrapper, and activate agent
          operations immediately. Every entity formed through Abraxas is
          vault-ready at inception. Powered by the Bags incorporation protocol.
        </p>
      </div>

      {/* Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {tiers.map((tier, i) => (
          <div
            key={tier.name}
            onClick={() => setSelectedTier(i)}
            className={`relative rounded-card p-6 cursor-pointer transition-all ${
              tier.featured
                ? "bg-gradient-to-b from-bg-2 to-[rgba(200,169,110,0.05)] border-[rgba(200,169,110,0.35)]"
                : "bg-bg-2 border-border"
            } border ${selectedTier === i ? "border-gold" : ""}`}
          >
            {tier.featured && (
              <div className="absolute -top-px left-6 right-6 h-px bg-gold opacity-60" />
            )}
            <div className="font-display font-bold text-base mb-1">{tier.name}</div>
            <div className="font-display text-2xl font-extrabold mb-3 text-gold">
              {tier.price ? formatCurrency(tier.price) : "Custom"}
            </div>
            <p className="text-xs text-abraxas-muted mb-4 leading-relaxed">{tier.desc}</p>
            <ul className="space-y-1.5">
              {tier.features.map((f) => (
                <li key={f} className="text-xs text-abraxas-muted flex gap-2">
                  <span className="text-gold flex-shrink-0">&rarr;</span> {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Payment rails */}
      <div className="bg-bg-2 border border-border rounded-card p-6 mb-6">
        <p className="text-[0.68rem] uppercase tracking-wider text-abraxas-subtle mb-4">
          Payment
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "USDC on Solana", sub: "Recommended", primary: true },
            { label: "SOL", sub: "Auto-converted to USDC" },
            { label: "USDC on Base", sub: "EVM compatible" },
          ].map((p) => (
            <div key={p.label}
              className={`rounded-lg border p-3 text-center text-xs ${
                p.primary ? "border-gold bg-gold-dim" : "border-border"
              }`}>
              <div className="font-display font-semibold text-sm mb-0.5">{p.label}</div>
              <div className="text-abraxas-subtle">{p.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Jurisdiction info */}
      <div className="bg-bg-2 border border-border rounded-card p-6 mb-8">
        <p className="text-[0.68rem] uppercase tracking-wider text-abraxas-subtle mb-3">
          Supported jurisdictions
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { name: "Wyoming DAO LLC", desc: "Recognizes on-chain governance. Clean, fast, US-based." },
            { name: "Marshall Islands DAO LLC", desc: "Purpose-built for crypto entities. Maximum flexibility." },
          ].map((j) => (
            <div key={j.name} className="bg-bg-3 rounded-lg p-4">
              <div className="font-display font-semibold text-sm mb-1">{j.name}</div>
              <div className="text-xs text-abraxas-muted leading-relaxed">{j.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Button size="lg" onClick={handleBegin} className="px-12">
          Begin Formation
        </Button>
        <p className="text-xs text-abraxas-subtle mt-3">
          Incorporation flow powered by Bags SDK &middot; On-chain payment &middot; Verifiable on Solana
        </p>
      </div>
    </div>
  );
}
