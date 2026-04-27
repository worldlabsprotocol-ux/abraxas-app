import { DefenseFeed } from "@/components/DefenseFeed";
import { systemStats } from "@/lib/mockData";
import { formatNumber, formatCurrency } from "@/lib/utils";

const totalPreserved = 72_380;

export default function DefensePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-abraxas-subtle mb-2">
          Circuit Defense
        </p>
        <h1 className="font-display font-bold text-3xl md:text-4xl mb-4">
          {formatNumber(systemStats.totalDefenseEvents)} events triggered.
          <span className="text-abraxas-green"> $0 unrecovered.</span>
        </h1>

        {/* Mechanism description */}
        <div className="bg-bg-2 border border-border rounded-card p-6 mb-8">
          <p className="text-sm text-abraxas-muted leading-relaxed">
            Circuit defense monitors position health across all active vaults at
            sub-second intervals. When predefined thresholds are crossed — volatility,
            drawdown, liquidity, or deviation from strategy parameters — agents execute
            defensive actions immediately. Position reductions, rotations, or full exits
            depending on severity.
          </p>
          <p className="text-sm text-abraxas-muted leading-relaxed mt-3">
            Every event is logged below. Every position has been recovered.
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-bg-2 border border-border rounded-card p-4 text-center">
            <div className="font-display font-bold text-2xl text-abraxas-text mb-1">
              {formatNumber(systemStats.totalDefenseEvents)}
            </div>
            <div className="text-[0.65rem] text-abraxas-subtle uppercase tracking-wider">
              Events Triggered
            </div>
          </div>
          <div className="bg-bg-2 border border-border rounded-card p-4 text-center">
            <div className="font-display font-bold text-2xl text-abraxas-green mb-1">
              {formatCurrency(totalPreserved)}
            </div>
            <div className="text-[0.65rem] text-abraxas-subtle uppercase tracking-wider">
              Capital Preserved
            </div>
          </div>
          <div className="bg-bg-2 border border-border rounded-card p-4 text-center">
            <div className="font-display font-bold text-2xl text-abraxas-green mb-1">
              $0
            </div>
            <div className="text-[0.65rem] text-abraxas-subtle uppercase tracking-wider">
              Unrecovered
            </div>
          </div>
        </div>
      </div>

      <DefenseFeed />
    </div>
  );
}
