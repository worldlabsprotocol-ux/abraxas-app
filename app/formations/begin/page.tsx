"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/Button";
import { useToast } from "@/lib/toastState";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

const TIERS = [
  { key: "formation", label: "Formation", price: 2500 },
  { key: "operated", label: "Operated Formation", price: 5500 },
  { key: "custom", label: "Custom Structure", price: 0 },
] as const;

const PAYMENT_METHODS = [
  { key: "usdc-solana", label: "USDC on Solana" },
  { key: "sol", label: "SOL" },
  { key: "usdc-base", label: "USDC on Base" },
] as const;

const JURISDICTIONS = [
  "Wyoming DAO LLC",
  "Marshall Islands DAO LLC",
  "Custom (we'll reach out)",
];

interface FormState {
  tier: string;
  jurisdiction: string;
  entityName: string;
  founderName: string;
  founderEmail: string;
  paymentMethod: string;
  category: string; // RWA, IP, Music, etc.
}

export default function BeginFormationPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { publicKey, connected } = useWallet();

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    tier: "operated",
    jurisdiction: "Wyoming DAO LLC",
    entityName: "",
    founderName: "",
    founderEmail: "",
    paymentMethod: "usdc-solana",
    category: "RWA",
  });

  const tier = TIERS.find((t) => t.key === form.tier) ?? TIERS[1];

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const validate = (): string | null => {
    if (!connected || !publicKey) return "Connect a Solana wallet first.";
    if (!form.entityName.trim()) return "Entity name is required.";
    if (!form.founderName.trim()) return "Founder name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.founderEmail))
      return "Valid founder email is required.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      showToast(err);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bags/incorporation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          founderWallet: publicKey?.toBase58(),
          priceUsd: tier.price,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(data.error ?? "Formation request failed. Try again.");
        setSubmitting(false);
        return;
      }
      showToast("Formation request submitted. Check your email for next steps.");
      // Brief delay so toast renders, then route home
      setTimeout(() => router.push("/app"), 1500);
    } catch (err) {
      console.error("[formations] submit error:", err);
      showToast("Network error — try again.");
      setSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display font-bold text-2xl mb-3">
          Connect a wallet to begin
        </h1>
        <p className="text-sm text-abraxas-muted mb-6 max-w-sm mx-auto leading-relaxed">
          Formations are tied to your Solana wallet. Connect first, then come back to this page.
        </p>
        <ConnectWalletButton size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <button
        onClick={() => router.push("/formations")}
        className="text-xs text-abraxas-subtle hover:text-gold mb-6"
      >
        ← Back to Formations
      </button>

      <h1 className="font-display font-bold text-2xl md:text-3xl mb-2">
        Begin Formation
      </h1>
      <p className="text-sm text-abraxas-muted mb-8 leading-relaxed">
        Fill in your entity details. We'll prepare the on-chain transaction
        and email next steps within 24 hours.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Tier */}
        <div>
          <label className="block text-[0.7rem] text-abraxas-subtle uppercase tracking-wider mb-2">
            Formation Tier
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TIERS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => updateField("tier", t.key)}
                className={`border rounded-lg p-3 text-left transition-all ${
                  form.tier === t.key
                    ? "border-gold bg-gold-dim"
                    : "border-border hover:border-border-2"
                }`}
              >
                <div className="font-display font-semibold text-xs mb-0.5">{t.label}</div>
                <div className="text-[0.7rem] text-abraxas-muted">
                  {t.price ? `$${t.price.toLocaleString()}` : "Custom"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Jurisdiction */}
        <div>
          <label className="block text-[0.7rem] text-abraxas-subtle uppercase tracking-wider mb-2">
            Jurisdiction
          </label>
          <select
            value={form.jurisdiction}
            onChange={(e) => updateField("jurisdiction", e.target.value)}
          >
            {JURISDICTIONS.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>

        {/* Entity Name */}
        <div>
          <label className="block text-[0.7rem] text-abraxas-subtle uppercase tracking-wider mb-2">
            Entity Name *
          </label>
          <input
            type="text"
            value={form.entityName}
            onChange={(e) => updateField("entityName", e.target.value)}
            placeholder="e.g. Atlas Royalty LLC"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-[0.7rem] text-abraxas-subtle uppercase tracking-wider mb-2">
            Asset Category
          </label>
          <select
            value={form.category}
            onChange={(e) => updateField("category", e.target.value)}
          >
            <option value="RWA">RWA (general)</option>
            <option value="Music IP">Music & IP Royalties</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Receivables">Receivables / Invoices</option>
            <option value="Treasury">Treasury</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Founder Name */}
          <div>
            <label className="block text-[0.7rem] text-abraxas-subtle uppercase tracking-wider mb-2">
              Founder Name *
            </label>
            <input
              type="text"
              value={form.founderName}
              onChange={(e) => updateField("founderName", e.target.value)}
              required
            />
          </div>

          {/* Founder Email */}
          <div>
            <label className="block text-[0.7rem] text-abraxas-subtle uppercase tracking-wider mb-2">
              Founder Email *
            </label>
            <input
              type="email"
              value={form.founderEmail}
              onChange={(e) => updateField("founderEmail", e.target.value)}
              required
            />
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-[0.7rem] text-abraxas-subtle uppercase tracking-wider mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => updateField("paymentMethod", p.key)}
                className={`border rounded-lg p-3 text-center text-xs transition-all ${
                  form.paymentMethod === p.key
                    ? "border-gold bg-gold-dim text-gold"
                    : "border-border text-abraxas-muted hover:border-border-2"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Wallet info */}
        <div className="bg-bg-3 border border-border rounded-lg p-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-abraxas-subtle">Founder wallet (Solana)</span>
            <span className="font-mono text-gold">
              {publicKey
                ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
                : "—"}
            </span>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          fullWidth
          size="lg"
          disabled={submitting}
        >
          {submitting
            ? "Submitting…"
            : tier.price
            ? `Submit Formation Request — $${tier.price.toLocaleString()}`
            : "Submit Custom Inquiry"}
        </Button>

        <p className="text-[0.7rem] text-abraxas-subtle text-center">
          Powered by Bags SDK incorporation. Payment confirmation email within 24 hours.
        </p>
      </form>
    </div>
  );
}
