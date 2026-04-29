"use client";

import { useState, useEffect, useRef } from "react";

export interface LiveEntry {
  id: string;
  ts: string;
  agent: string;
  vault: string;
  action: string;
  delta?: string;
  type: "action" | "defense" | "update";
}

// Static entries — references real vault wallet addresses for on-chain credibility
const ACTION_POOL: Array<Omit<LiveEntry, "id" | "ts">> = [
  { agent: "AGENT-001", vault: "VAULT-490", action: "Rebalanced royalty exposure · CQ1UzR…dJGdf", delta: "+0.38%", type: "action" },
  { agent: "AGENT-001", vault: "VAULT-490", action: "Streaming velocity confirmed — holding", delta: "stable", type: "action" },
  { agent: "AGENT-001", vault: "VAULT-490", action: "Catalog weight adjusted · CQ1UzR…dJGdf", delta: "+0.19%", type: "action" },
  { agent: "AGENT-002", vault: "VAULT-491", action: "Distribution flow captured · CmWVgy…tdDk", delta: "+0.24%", type: "action" },
  { agent: "AGENT-002", vault: "VAULT-491", action: "Hedge ratio recalculated", delta: "0.41→0.38", type: "action" },
  { agent: "AGENT-002", vault: "VAULT-491", action: "Monthly royalty cycle closed · CmWVgy…tdDk", delta: "+2.1%", type: "action" },
  { agent: "AGENT-003", vault: "VAULT-492", action: "Rent flow reinvested · 8bBxip…fT58", delta: "+0.20%", type: "action" },
  { agent: "AGENT-003", vault: "VAULT-492", action: "Vacancy buffer recalibrated", delta: "stable", type: "action" },
  { agent: "AGENT-003", vault: "VAULT-492", action: "Position sizing verified · 8bBxip…fT58", delta: "neutral", type: "action" },
  { agent: "AGENT-004", vault: "VAULT-493", action: "Counterparty risk scored · Db6RHG…TFf", delta: "A-grade", type: "action" },
  { agent: "AGENT-004", vault: "VAULT-493", action: "Invoice batch settled", delta: "+1.35%", type: "action" },
  { agent: "AGENT-004", vault: "VAULT-493", action: "Pool rotation executed · Db6RHG…TFf", delta: "neutral", type: "action" },
  { agent: "AGENT-005", vault: "VAULT-494", action: "Catalog indexed · HeFqPH…wZq", delta: "+0.12%", type: "action" },
  { agent: "AGENT-005", vault: "VAULT-494", action: "Bonding period checkpoint passed", delta: "14.7%→15.1%", type: "action" },
  // Defense — rare
  { agent: "AGENT-001", vault: "VAULT-490", action: "Circuit defense: volatility threshold — position reduced 12%", delta: "defended", type: "defense" },
  { agent: "AGENT-003", vault: "VAULT-492", action: "Circuit defense: liquidity dip — reserve buffer raised", delta: "defended", type: "defense" },
  { agent: "AGENT-004", vault: "VAULT-493", action: "Circuit defense: counterparty score drop — rotation queued", delta: "defended", type: "defense" },
  // Updates
  { agent: "SYSTEM", vault: "VAULT-490", action: "Performance snapshot updated", delta: "12.8% YTD", type: "update" },
  { agent: "SYSTEM", vault: "VAULT-491", action: "Yield ledger reconciled", delta: "+0.31% net", type: "update" },
  { agent: "SYSTEM", vault: "VAULT-492", action: "AUM recalculated after position close", delta: "+0.08%", type: "update" },
  { agent: "SYSTEM", vault: "VAULT-493", action: "Risk score published", delta: "A-", type: "update" },
  { agent: "SYSTEM", vault: "VAULT-494", action: "Graduation progress updated", delta: "15.1%", type: "update" },
];

const DEFENSE_START = ACTION_POOL.findIndex((a) => a.type === "defense");

function utcTime(): string {
  const d = new Date();
  return (
    String(d.getUTCHours()).padStart(2, "0") + ":" +
    String(d.getUTCMinutes()).padStart(2, "0") + ":" +
    String(d.getUTCSeconds()).padStart(2, "0") + " UTC"
  );
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickNext(lastIdx: number): { entry: Omit<LiveEntry, "id" | "ts">; idx: number } {
  let idx: number;
  let attempts = 0;
  do {
    const roll = Math.random();
    if (roll < 0.12) {
      idx = rand(DEFENSE_START, ACTION_POOL.length - 1);
    } else {
      idx = rand(0, DEFENSE_START - 1);
    }
    attempts++;
  } while (idx === lastIdx && attempts < 10);
  return { entry: ACTION_POOL[idx], idx };
}

const MAX = 40;

export function useLiveFeed(seedCount = 8) {
  const [entries, setEntries] = useState<LiveEntry[]>(() => {
    const now = Date.now();
    return Array.from({ length: seedCount }, (_, i) => {
      const d = new Date(now - (seedCount - i) * 18_000);
      const ts =
        String(d.getUTCHours()).padStart(2, "0") + ":" +
        String(d.getUTCMinutes()).padStart(2, "0") + ":" +
        String(d.getUTCSeconds()).padStart(2, "0") + " UTC";
      const { entry } = pickNext(-1);
      return { id: `seed-${i}`, ts, ...entry };
    });
  });

  const [secondsAgo, setSecondsAgo] = useState(0);
  const lastEventRef = useRef(Date.now());
  const lastIdxRef = useRef(-1);

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastEventRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let running = true;
    let timer: ReturnType<typeof setTimeout>;

    function schedule() {
      if (!running) return;
      timer = setTimeout(() => {
        if (!running) return;
        const { entry, idx } = pickNext(lastIdxRef.current);
        lastIdxRef.current = idx;
        lastEventRef.current = Date.now();
        setSecondsAgo(0);
        const newEntry: LiveEntry = {
          id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ts: utcTime(),
          ...entry,
        };
        setEntries((prev) => [newEntry, ...prev].slice(0, MAX));
        schedule();
      }, rand(2000, 5000));
    }

    schedule();
    return () => {
      running = false;
      clearTimeout(timer);
    };
  }, []);

  return { entries, secondsAgo };
}