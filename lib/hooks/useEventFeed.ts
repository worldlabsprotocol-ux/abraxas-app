// FILE: lib/hooks/useEventFeed.ts
// Real-time protocol event stream — ASSET_TOKENIZED, ASSET_VERIFIED, ASSET_LISTED, BORROW_CREATED.
// DB-first with real-time subscription. Zustand fallback in demo mode.

"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAbraStore } from "@/lib/abraxasStore";

export interface FeedEvent {
  id:string; type:string; assetName?:string; assetCategory?:string;
  wallet:string; timestamp:number; payload:Record<string,unknown>;
}

export function useEventFeed(limit = 12) {
  const [events,  setEvents]  = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const storeEvents = useAbraStore(s => s.events);

  const fetchEvents = useCallback(async () => {
    if (!supabase) {
      setEvents(storeEvents.slice(-limit).reverse().map(e => ({
        id:e.id, type:e.eventType, wallet:e.wallet ?? "",
        timestamp:e.timestamp, payload:e.payload as Record<string,unknown>,
        assetName:String(e.payload?.name ?? ""),
      })));
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("events")
      .select(`*, assets(name, category)`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (data) {
      setEvents(data.map(e => ({
        id:e.id, type:e.type, wallet:e.wallet ?? "",
        timestamp: new Date(e.created_at).getTime(),
        payload: e.payload ?? {},
        assetName: e.assets?.name,
        assetCategory: e.assets?.category,
      })));
    }
    setLoading(false);
  }, [limit, storeEvents]);

  useEffect(() => {
    fetchEvents();

    if (supabase) {
      const ch = supabase.channel("event-feed")
        .on("postgres_changes",
          { event:"INSERT", schema:"public", table:"events" },
          () => fetchEvents()
        ).subscribe();
      return () => { supabase.removeChannel(ch); };
    }
  }, [fetchEvents]);

  return { events, loading };
}