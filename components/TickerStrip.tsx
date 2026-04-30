"use client";

import { useEffect, useState, useRef } from "react";

interface TickerItem {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}

const STATIC_ITEMS: TickerItem[] = [
  { label: "SOL",        value: "$145.20",  change: "+2.1%",  positive: true  },
  { label: "BTC",        value: "$94,200",  change: "+0.8%",  positive: true  },
  { label: "ETH",        value: "$3,180",   change: "-0.4%",  positive: false },
  { label: "ONDO",       value: "$1.24",    change: "+3.2%",  positive: true  },
  { label: "$ABRA",      value: "$0.000054",change: "+14.7%", positive: true  },
  { label: "RWA TVL",    value: "$33.2B",   change: "+340% YoY", positive: true },
  { label: "Music IP",   value: "$32.4B",   change: "+12.4% YoY", positive: true },
  { label: "VAULT-490",  value: "12.8% APY",change: "Operating", positive: true },
  { label: "VAULT-491",  value: "11.4% APY",change: "Operating", positive: true },
  { label: "VAULT-492",  value: "6.2% APY", change: "Operating", positive: true },
  { label: "abraSOUND",  value: "12.8% APY",change: "Pool Live", positive: true },
  { label: "abraYIELD",  value: "7.4% APY", change: "Pool Live", positive: true },
  { label: "NFT Vol 24h",value: "$18.4M",   change: "ETH",    positive: true  },
];

export function TickerStrip() {
  const [items, setItems] = useState<TickerItem[]>(STATIC_ITEMS);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch live SOL price
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum,ondo-finance&vs_currencies=usd&include_24hr_change=true")
      .then((r) => r.json())
      .then((data) => {
        setItems((prev) => prev.map((item) => {
          if (item.label === "SOL" && data.solana) return { ...item, value: `$${data.solana.usd.toFixed(2)}`, change: `${data.solana.usd_24h_change > 0 ? "+" : ""}${data.solana.usd_24h_change.toFixed(1)}%`, positive: data.solana.usd_24h_change >= 0 };
          if (item.label === "BTC" && data.bitcoin) return { ...item, value: `$${(data.bitcoin.usd/1000).toFixed(1)}K`, change: `${data.bitcoin.usd_24h_change > 0 ? "+" : ""}${data.bitcoin.usd_24h_change.toFixed(1)}%`, positive: data.bitcoin.usd_24h_change >= 0 };
          if (item.label === "ETH" && data.ethereum) return { ...item, value: `$${data.ethereum.usd.toLocaleString()}`, change: `${data.ethereum.usd_24h_change > 0 ? "+" : ""}${data.ethereum.usd_24h_change.toFixed(1)}%`, positive: data.ethereum.usd_24h_change >= 0 };
          if (item.label === "ONDO" && data["ondo-finance"]) return { ...item, value: `$${data["ondo-finance"].usd.toFixed(2)}`, change: `${data["ondo-finance"].usd_24h_change > 0 ? "+" : ""}${data["ondo-finance"].usd_24h_change.toFixed(1)}%`, positive: data["ondo-finance"].usd_24h_change >= 0 };
          return item;
        }));
      }).catch(() => {});
  }, []);

  const doubled = [...items, ...items];

  return (
    <div style={{
      width: "100%", overflow: "hidden",
      background: "rgba(200,169,110,0.03)",
      borderBottom: "1px solid rgba(200,169,110,0.08)",
      height: "26px",
      display: "flex", alignItems: "center",
    }}>
      <div
        ref={ref}
        style={{
          display: "flex", alignItems: "center", gap: "0",
          animation: "ticker-scroll 45s linear infinite",
          whiteSpace: "nowrap",
        }}
      >
        {doubled.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0 1.25rem", fontSize: "0.6rem", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ color: "var(--subtle)", letterSpacing: "0.04em" }}>{item.label}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "var(--text)" }}>{item.value}</span>
            {item.change && (
              <span style={{ color: item.positive ? "var(--green)" : "var(--red)", fontSize: "0.55rem" }}>{item.change}</span>
            )}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}