import { AgentFeed } from "@/components/AgentFeed";
import { DefenseFeed } from "@/components/DefenseFeed";
import { RevenuePanel } from "@/components/RevenuePanel";
import { systemStats } from "@/lib/mockData";
import { formatNumber, formatCurrency } from "@/lib/utils";

const stats = [
  { label: "Total AUM", value: formatCurrency(systemStats.totalAUM) },
  { label: "Agent Actions", value: formatNumber(systemStats.totalActions) },
  { label: "Defense Events", value: formatNumber(systemStats.totalDefenseEvents) },
  { label: "Unrecovered Positions", value: "0", highlight: true },
  { label: "Agents Online", value: String(systemStats.agentsOnline) },
  { label: "Vaults Active", value: String(systemStats.vaultsActive) },
  { label: "System Uptime", value: `${systemStats.uptimePct}%` },
  { label: "Settlement Chain", value: "Solana" },
];

export default function LivePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-abraxas-green animate-pulse" />
          <span className="text-[0.68rem] text-abraxas-subtle uppercase tracking-widest">
            Live System Performance
          </span>
        </div>
        <h1 className="font-display font-bold text-3xl md:text-4xl mb-2">
          Abraxas is operating.
        </h1>
        <p className="text-sm text-abraxas-muted max-w-lg leading-relaxed">
          Real-time agent actions, circuit defense events, and system metrics.
          Every number is verifiable on-chain.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-bg-2 border border-border rounded-card p-4">
            <div className={`font-display font-bold text-xl mb-1 ${
              s.highlight ? "text-abraxas-green" : "text-abraxas-text"
            }`}>
              {s.value}
            </div>
            <div className="text-[0.65rem] text-abraxas-subtle uppercase tracking-wider">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Live revenue — pulled directly from Bags API.
          The single most important credibility signal on the page. */}
      <div className="mb-6">
        <RevenuePanel />
      </div>

      {/* Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AgentFeed />
        <DefenseFeed />
      </div>

      {/* Credibility note */}
      <div className="mt-6 text-center">
        <p className="text-[0.68rem] text-abraxas-subtle">
          Beta — agent network in active development &nbsp;&middot;&nbsp;
          Numbers represent mock data advancing to live &nbsp;&middot;&nbsp;
          On-chain verification available at graduation
        </p>
      </div>
    </div>
  );
}
