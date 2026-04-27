"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { WalletGate } from "@/components/WalletGate";
import { useToast } from "@/lib/toastState";
import { assetCategories } from "@/lib/mockData";

const goals = [
  { key: "deploy", icon: "◈", label: "Deploy to Vault" },
  { key: "investors", icon: "◎", label: "Attract Capital" },
  { key: "sell", icon: "↗", label: "Sell Asset" },
];

function ListForm() {
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState<string | null>("deploy");

  const handleSubmit = () => {
    if (!name || !category || !value) {
      showToast("Please fill in all required fields.");
      return;
    }
    showToast("Asset registered. Routing to vault assignment...");
    setTimeout(() => router.push("/marketplace"), 800);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PageHeader
        title="Register an Asset"
        subtitle="Bring your real-world asset into Abraxas. Once registered, an agent will assign it to an operating vault."
      />

      <div className="space-y-5">
        <div>
          <label className="block text-[0.72rem] text-abraxas-subtle uppercase tracking-wider mb-2">
            Asset Name *
          </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Music Catalog 2024, Beachfront Property" />
        </div>

        <div>
          <label className="block text-[0.72rem] text-abraxas-subtle uppercase tracking-wider mb-2">
            Category *
          </label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select category</option>
            {assetCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[0.72rem] text-abraxas-subtle uppercase tracking-wider mb-2">
            Estimated Value (USD) *
          </label>
          <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="250000" />
        </div>

        <div>
          <label className="block text-[0.72rem] text-abraxas-subtle uppercase tracking-wider mb-2">
            Description
          </label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe the asset, condition, and any details that affect operating strategy..." />
        </div>

        <div>
          <label className="block text-[0.72rem] text-abraxas-subtle uppercase tracking-wider mb-2">
            Proof of Ownership
          </label>
          <div className="border border-dashed border-border-2 rounded-lg p-8 text-center cursor-pointer hover:border-gold transition-colors">
            <div className="text-2xl mb-2">↑</div>
            <p className="text-sm text-abraxas-muted mb-1">Upload deed, title, or documentation</p>
            <p className="text-xs text-abraxas-subtle">PDF, JPG, PNG &middot; max 20MB</p>
          </div>
        </div>

        <div>
          <label className="block text-[0.72rem] text-abraxas-subtle uppercase tracking-wider mb-2">
            Your Goal
          </label>
          <div className="grid grid-cols-3 gap-3">
            {goals.map((g) => (
              <button key={g.key} onClick={() => setGoal(g.key)}
                className={`border rounded-lg py-4 px-2 text-center cursor-pointer transition-all ${
                  goal === g.key ? "border-gold bg-gold-dim" : "border-border hover:border-border-2"
                }`}>
                <div className={`text-xl mb-2 ${goal === g.key ? "text-gold" : ""}`}>{g.icon}</div>
                <span className={`text-xs block ${goal === g.key ? "text-gold" : "text-abraxas-muted"}`}>
                  {g.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Button fullWidth size="lg" onClick={handleSubmit} className="mt-2">
          Register Asset →
        </Button>

        <p className="text-xs text-abraxas-subtle text-center">
          Registered assets enter the operating layer. Agents take over from there.
        </p>
      </div>
    </div>
  );
}

export default function ListPage() {
  return <WalletGate><ListForm /></WalletGate>;
}
