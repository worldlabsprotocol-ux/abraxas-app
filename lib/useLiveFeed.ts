"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface LiveEntry {
  id: string;
  ts: string;       // HH:MM:SS UTC
  agent: string;    // "AGENT-001"
  vault: string;    // "VAULT-490"
  action: string;
  delta?: string;
  type: "action" | "defense" | "update";
}

// Full action pool — varied enough to never look scripted
const ACTION_POOL: Array<Omit<LiveEntry, "id" | "ts">> = [
  { agent: "AGENT-001", vault: "VAULT-490", action: "Rebalanced royalty exposure", delta: "+0.38%", type: "action" },
  { agent: "AGENT-001", vault: "VAULT-490", action: "Streaming velocity confirmed — holding", delta: "stable", type: "action" },
  { agent: "AGENT-001", vault: "VAULT-490", action: "Catalog weight adjusted", delta: "+0.19%", type: "action" },
  { agent: "AGENT-002", vault: "VAULT-491", action: "Distribution flow captured", delta: "+$214", type: "action" },
  { agent: "AGENT-002", vault: "VAULT-491", action: "Hedge ratio recalculated", delta: "0.41→0.38", type: "action" },
  { agent: "AGENT-002", vault: "VAULT-491", action: "Monthly royalty cycle closed", delta: "+$1,840", type: "action" },
  { agent: "AGENT-003", vault: "VAULT-492", action: "Rent flow reinvested", delta: "+$640", type: "action" },
  { agent: "AGENT-003", vault: "VAULT-492", action: "Vacancy buffer recalibrated", delta: "stable", type: "action" },
  { agent: "AGENT-003", vault: "VAULT-492", action: "Position sizing verified", delta: "neutral", type: "action" },
  { agent: "AGENT-004", vault: "VAULT-493", action: "Counterparty risk scored", delta: "A-grade", type: "action" },
  { agent: "AGENT-004", vault: "VAULT-493", action: "Invoice batch settled", delta: "+$870", type: "action" },
  { agent: "AGENT-004", vault: "VAULT-493", action: "Pool rotation executed", delta: "neutral", type: "action" },
  { agent: "AGENT-005", vault: "VAULT-494", action: "Catalog indexed", delta: "+0.12%", type: "action" },
  { agent: "AGENT-005", vault: "VAULT-494", action: "Bonding period checkpoint passed", delta: "14.7%→15.1%", type: "action" },
  // Defense events — rare
  { agent: "AGENT-001", vault: "VAULT-490", action: "Circuit defense: volatility threshold breached — position reduced 12%", delta: "defended", type: "defense" },
  { agent: "AGENT-003", vault: "VAULT-492", action: "Circuit defense: liquidity dip detected — reserve buffer raised", delta: "defended", type: "defense" },
  { agent: "AGENT-004", vault: "VAULT-493", action: "Circuit defense: counterparty score dropped — rotation queued", delta: "defended", type: "defense" },
  // System updates
  { agent: "SYSTEM", vault: "VAULT-490", action: "Performance snapshot updated", delta: "12.8% YTD", type: "update" },
  { agent: "SYSTEM", vault: "VAULT-491", action: "Yield ledger reconciled", delta: "+$420 net", type: "update" },
  { agent: "SYSTEM", vault: "VAULT-492", action: "AUM recalculated after position close", delta: "$320,000", type: "update" },
  { agent: "SYSTEM", vault: "VAULT-493", action: "Risk score published", delta: "A-", type: "update" },
  { agent: "SYSTEM", vault: "VAULT-494", action: "Graduation progress updated", delta: "15.1%", type: "update" },
];

function utcTime(): string {
  return new Date().toUTCString().split(" ")[4] + " UTC";
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nextEntry(lastIdx: number): { entry: Omit<LiveEntry, "id" | "ts">; idx: number } {
  // Avoid repeating the same entry back-to-back
  // Defense events: ~1 in 7 chance
  let idx: number;
  do {
    // Bias away from defense events (they're at the end of the pool)
    const defenseStart = ACTION_POOL.findIndex((a) => a.type === "defense");
    const roll = Math.random();
    if (roll < 0.15 && defenseStart >= 0) {
      idx = randomBetween(defenseStart, ACTION_POOL.length - 1);
    } else {
      idx = randomBetween(0, defenseStart - 1);
    }
  } while (idx === lastIdx && ACTION_POOL.length > 1);

  return { entry: ACTION_POOL[idx], idx };
}

const MAX_ENTRIES = 40;

/**
 * Generates a continuously-updating live feed of agent activity.
 * New entries arrive every 2–5 seconds with slight variation in timing.
 * Returns the current feed (newest first) plus a "last updated" counter.
 */
export function useLiveFeed(seedCount = 8) {
  const [entries, setEntries] = useState<LiveEntry[]>(() => {
    // Seed with initial entries using staggered fake times
    const now = new Date();
    return Array.from({ length: seedCount }, (_, i) => {
      const t = new Date(now.getTime() - (seedCount - i) * 18_000);
      const h = String(t.getUTCHours()).padStart(2, "0");
      const m = String(t.getUTCMinutes()).padStart(2, "0");
      const s = String(t.getUTCSeconds()).padStart(2, "0");
      const { entry, idx } = nextEntry(-1);
      return {
        id: `seed-${i}`,
        ts: `${h}:${m}:${s} UTC`,
        ...entry,
      };
    });
  });

  const [secondsAgo, setSecondsAgo] = useState(0);
  const lastEventTime = useRef<number>(Date.now());
  const lastIdxRef = useRef<number>(-1);

  // Ticker: update "X seconds ago" every second
  useEffect(() => {
    const ticker = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastEventTime.current) / 1000));
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Feed generator: new entry every 2–5 seconds (randomised)
  const scheduleNext = useCallback(() => {
    const delay = randomBetween(2000, 5000);
    return setTimeout(() => {
      const { entry, idx } = nextEntry(lastIdxRef.current);
      lastIdxRef.current = idx;
      lastEventTime.current = Date.now();
      setSecondsAgo(0);

      const newEntry: LiveEntry = {
        id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ts: utcTime(),
        ...entry,
      };

      setEntries((prev) => [newEntry, ...prev].slice(0, MAX_ENTRIES));
    }, delay);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function loop() {
      timer = scheduleNext();
      // Re-schedule after the timer fires by chaining
    }
    loop();
    // We can't chain cleanly in one effect, so use a recursive approach
    let running = true;
    function recurse() {
      if (!running) return;
      const delay = randomBetween(2000, 5000);
      timer = setTimeout(() => {
        if (!running) return;
        const { entry, idx } = nextEntry(lastIdxRef.current);
        lastIdxRef.current = idx;
        lastEventTime.current = Date.now();
        setSecondsAgo(0);
        const newEntry: LiveEntry = {
          id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ts: utcTime(),
          ...entry,
        };
        setEntries((prev) => [newEntry, ...prev].slice(0, MAX_ENTRIES));
        recurse();
      }, delay);
    }
    // Clear the first timer from `loop()` and use the recursive one
    clearTimeout(timer!);
    recurse();
    return () => {
      running = false;
      clearTimeout(timer);
    };
  }, []);

  return { entries, secondsAgo };
}