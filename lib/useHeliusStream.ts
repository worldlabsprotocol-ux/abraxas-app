// FILE: lib/useHeliusStream.ts
// Real-time Helius event stream via Server-Sent Events.
// EventSource connects to /api/stream — zero new packages, works everywhere.
// Status: CONNECTING → LIVE → DISCONNECTED
// On event: calls ingestHeliusEvent() to update systemState.
"use client";

import { useEffect, useState, useRef } from "react";
import { ingestHeliusEvent } from "@/lib/systemState";

export type StreamStatus = "CONNECTING" | "LIVE" | "DISCONNECTED" | "IDLE";

export interface StreamState {
  status:     StreamStatus;
  eventCount: number;
  lastEvent:  { ts: number; type: string; description: string; riskSignal: string; reasoning?: string } | null;
  reasoning:  string[];  // last 20 reasoning lines for the terminal
}

export function useHeliusStream(vaultId?: string): StreamState {
  const [status,     setStatus]     = useState<StreamStatus>("IDLE");
  const [eventCount, setEventCount] = useState(0);
  const [lastEvent,  setLastEvent]  = useState<StreamState["lastEvent"]>(null);
  const [reasoning,  setReasoning]  = useState<string[]>([]);
  const esRef   = useRef<EventSource | null>(null);
  const retries = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function connect() {
      setStatus("CONNECTING");
      const es = new EventSource("/api/stream");
      esRef.current = es;

      es.onopen = () => {
        setStatus("LIVE");
        retries.current = 0;
      };

      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === "CONNECTED") return;

          // Push to systemState
          ingestHeliusEvent({
            ts:          payload.ts ?? Date.now(),
            type:        payload.type ?? "UNKNOWN",
            source:      "helius",
            signature:   payload.signature,
            description: payload.description ?? payload.type,
            riskSignal:  payload.riskSignal ?? "none",
            vaultId,
          });

          setLastEvent({
            ts:          payload.ts ?? Date.now(),
            type:        payload.type,
            description: payload.description,
            riskSignal:  payload.riskSignal,
            reasoning:   payload.reasoning,
          });

          if (payload.reasoning) {
            setReasoning((prev) => [payload.reasoning, ...prev].slice(0, 20));
          }

          setEventCount((n) => n + 1);
        } catch {}
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        setStatus("DISCONNECTED");
        // Exponential backoff — reconnect up to 5 times
        if (retries.current < 5) {
          const delay = Math.min(1000 * 2 ** retries.current, 30_000);
          retries.current++;
          setTimeout(connect, delay);
        }
      };
    }

    connect();
    return () => { esRef.current?.close(); esRef.current = null; };
  }, [vaultId]);

  return { status, eventCount, lastEvent, reasoning };
}