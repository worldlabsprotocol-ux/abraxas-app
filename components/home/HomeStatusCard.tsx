// FILE: components/home/HomeStatusCard.tsx
// Credible status card — live / in-progress items + mainnet gate bar.

import {
  HOMEPAGE_STATUS_LEAD,
  HOMEPAGE_STATUS_ITEMS,
  mainnetGateProgress,
} from "@/lib/mainnetStatus";

const STATUS_LABEL: Record<string, string> = {
  live: "Live",
  in_progress: "In progress",
  planned: "Planned",
};

export function HomeStatusCard() {
  const { done, total } = mainnetGateProgress();
  const pct = Math.round((done / total) * 100);

  return (
    <section aria-labelledby="status-heading" className="pr-section pr-section-border">
      <span className="pr-label">Status</span>
      <h2 id="status-heading" className="pr-h2">Live today — staged toward full mainnet</h2>
      <div className="pr-status-card">
        <p className="pr-body">{HOMEPAGE_STATUS_LEAD}</p>
        <ul className="pr-status-list">
          {HOMEPAGE_STATUS_ITEMS.map((item) => (
            <li key={item.label} className="pr-status-item">
              <span className={`pr-status-pill pr-status-pill--${item.status}`}>
                {STATUS_LABEL[item.status]}
              </span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        <div className="pr-gate-bar" aria-label={`Mainnet gates ${done} of ${total} complete`}>
          <div className="pr-gate-bar-track">
            <div className="pr-gate-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="pr-gate-bar-label">{done}/{total} mainnet gates</span>
        </div>
      </div>
    </section>
  );
}
