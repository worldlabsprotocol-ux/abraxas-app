import { ABRA } from "@/lib/constants";
import { Button } from "@/components/Button";

export default function AbraPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-abraxas-subtle mb-2">
        The participation token
      </p>
      <h1 className="font-display font-bold text-4xl md:text-5xl mb-8">
        $ABRA
      </h1>

      {/* Core description */}
      <div className="bg-bg-2 border border-border rounded-card p-7 mb-5">
        <p className="text-sm text-abraxas-muted leading-relaxed mb-4">
          $ABRA is the participation token of the Abraxas operating layer.
          The token grows as the system grows — every vault activated, every
          agent action executed, every asset operated contributes to the
          network the token represents.
        </p>
        <p className="text-sm text-abraxas-muted leading-relaxed mb-4">
          No private allocations. No team unlocks ahead of users.
          No VC tranches.
        </p>
        <p className="text-sm text-abraxas-text leading-relaxed font-medium">
          $ABRA is earned by participation — listing assets, depositing to
          vaults, and operating capital through Abraxas.
        </p>
      </div>

      {/* Token data */}
      <div className="bg-bg-2 border border-border rounded-card p-6 mb-5">
        <div className="divide-y divide-border">
          {[
            { label: "Contract Address", value: ABRA.ca, mono: true, link: ABRA.solscan },
            { label: "Chain", value: "Solana" },
            { label: "Ticker", value: "$ABRA" },
            { label: "Allocation", value: "No private sale · No VC" },
            { label: "Earned by", value: "Vault participation & asset activation" },
          ].map(({ label, value, mono, link }) => (
            <div key={label} className="flex justify-between items-center py-3 gap-4">
              <span className="text-xs text-abraxas-subtle flex-shrink-0">{label}</span>
              {link ? (
                <a href={link} target="_blank" rel="noopener noreferrer"
                  className={`text-xs text-gold hover:underline text-right break-all ${mono ? "font-mono" : ""}`}>
                  {value}
                </a>
              ) : (
                <span className={`text-xs text-right ${mono ? "font-mono text-gold" : "text-abraxas-text"}`}>
                  {value}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Access tiers */}
      <div className="bg-bg-2 border border-border rounded-card p-6 mb-6">
        <p className="text-[0.68rem] uppercase tracking-wider text-abraxas-subtle mb-4">
          Participation Tiers
        </p>
        <div className="space-y-4">
          {[
            { tier: "1", label: "OG ETH Collection", desc: "Legacy holders from the pre-Abraxas era. Early access, recognition, and future eligibility." },
            { tier: "2", label: "$ABRA Holders", desc: "Ecosystem participants. Top holders receive access-layer benefits and priority features as the protocol matures." },
            { tier: "3", label: "Abraxas Operators", desc: "Users who deposit to vaults, activate assets, and operate capital. The highest-value participation path." },
          ].map((t) => (
            <div key={t.tier} className="flex gap-4">
              <div className={`font-display text-3xl font-extrabold leading-none flex-shrink-0 w-8 ${
                t.tier === "1" ? "text-gold" : "text-border-2"
              }`}>{t.tier}</div>
              <div>
                <div className="font-display font-semibold text-sm mb-1">{t.label}</div>
                <p className="text-xs text-abraxas-muted leading-relaxed">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <a href={ABRA.bags} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button fullWidth>Trade on Bags</Button>
        </a>
        <a href={ABRA.solscan} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button fullWidth variant="ghost">View on Solscan</Button>
        </a>
        <a href={ABRA.dexscreener} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button fullWidth variant="secondary">Chart</Button>
        </a>
      </div>
    </div>
  );
}
