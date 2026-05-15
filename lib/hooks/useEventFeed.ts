"use client";
export interface FeedEvent { id: string; type: string; message: string; ts: number; }
export function useEventFeed() {
  return { events: [] as FeedEvent[], loading: false };
}
