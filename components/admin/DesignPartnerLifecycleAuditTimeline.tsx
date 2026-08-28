"use client";
// FILE: components/admin/DesignPartnerLifecycleAuditTimeline.tsx
// Read-only lifecycle audit timeline for an expanded application detail panel.

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin/adminFetch";
import { useProductionAdminSessionGate } from "@/lib/admin/productionAdminSessionUi";
import {
  DESIGN_PARTNER_LIFECYCLE_AUDIT_EVENT_DTO_KEYS,
  DESIGN_PARTNER_LIFECYCLE_AUDIT_RESPONSE_KEYS,
  type DesignPartnerLifecycleAuditEventDto,
  type DesignPartnerLifecycleAuditResponse,
} from "@/lib/admin/designPartnerLifecycleAuditContract";
import type { DesignPartnerLifecycleAuditAction } from "@/lib/admin/designPartnerApplicationLifecycleAuditMetadata";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

const EVENT_LABELS: Record<DesignPartnerLifecycleAuditAction, string> = {
  "admin.design_partner.approved": "Approved",
  "admin.design_partner.rejected": "Rejected",
  "admin.design_partner.promoted": "Promoted to sandbox",
};

const EMPTY_COPY = "No lifecycle events recorded for this application.";
const INCOMPLETE_HISTORY_COPY =
  "Lifecycle events are recorded for atomic promote and transition actions. Approve/reject history before atomic wiring may be incomplete.";
const LOAD_ERROR_COPY = "Lifecycle history unavailable.";
const LOADING_COPY = "Loading lifecycle history…";

function isLifecycleAuditResponse(value: unknown): value is DesignPartnerLifecycleAuditResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== DESIGN_PARTNER_LIFECYCLE_AUDIT_RESPONSE_KEYS.length) return false;
  for (const key of DESIGN_PARTNER_LIFECYCLE_AUDIT_RESPONSE_KEYS) {
    if (!(key in record)) return false;
  }
  if (typeof record.application_id !== "string") return false;
  if (!Array.isArray(record.events)) return false;
  if (record.next_cursor !== null && typeof record.next_cursor !== "string") return false;

  for (const item of record.events) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const event = item as Record<string, unknown>;
    const eventKeys = Object.keys(event);
    if (eventKeys.length !== DESIGN_PARTNER_LIFECYCLE_AUDIT_EVENT_DTO_KEYS.length) return false;
    for (const key of DESIGN_PARTNER_LIFECYCLE_AUDIT_EVENT_DTO_KEYS) {
      if (!(key in event)) return false;
    }
  }

  return true;
}

function formatOccurredAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function DesignPartnerLifecycleAuditTimeline({
  applicationId,
}: {
  applicationId: string;
}) {
  const gate = useProductionAdminSessionGate();
  const [events, setEvents] = useState<DesignPartnerLifecycleAuditEventDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const requestGenerationRef = useRef(0);
  const initialFetchedForApplicationRef = useRef<string | null>(null);
  const consumedCursorsRef = useRef<Set<string>>(new Set());
  const inFlightCursorsRef = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  const requestLifecycleAudit = useCallback(async (
    url: string,
    signal: AbortSignal,
  ) => {
    if (gate.usePinUnlock) {
      const headers = new Headers();
      if (gate.pin) {
        headers.set("x-admin-pin", gate.pin);
      }
      return fetch(url, {
        cache: "no-store",
        credentials: "include",
        headers,
        signal,
      });
    }
    return adminFetch(url, { cache: "no-store", signal });
  }, [gate.pin, gate.usePinUnlock]);

  const fetchPage = useCallback(async (
    cursor: string | null,
    options: { append: boolean; generation: number; signal: AbortSignal },
  ) => {
    const params = new URLSearchParams();
    if (cursor) {
      params.set("cursor", cursor);
    }

    const url = `/api/admin/design-partners/${encodeURIComponent(applicationId)}/lifecycle-audit${
      params.size > 0 ? `?${params.toString()}` : ""
    }`;

    const res = await requestLifecycleAudit(url, options.signal);

    if (options.signal.aborted || options.generation !== requestGenerationRef.current) {
      return;
    }

    if (!res.ok) {
      setError(true);
      return;
    }

    const payload = await res.json();
    if (options.signal.aborted || options.generation !== requestGenerationRef.current) {
      return;
    }

    if (!isLifecycleAuditResponse(payload) || payload.application_id !== applicationId) {
      setError(true);
      return;
    }

    setError(false);
    setNextCursor(payload.next_cursor);
    setEvents((current) => (options.append ? [...current, ...payload.events] : payload.events));
  }, [applicationId, requestLifecycleAudit]);

  useEffect(() => {
    requestGenerationRef.current += 1;
    const generation = requestGenerationRef.current;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setEvents([]);
    setNextCursor(null);
    setError(false);
    setLoading(false);
    setLoadingMore(false);
    consumedCursorsRef.current = new Set();
    inFlightCursorsRef.current = new Set();
    initialFetchedForApplicationRef.current = null;

    if (gate.loading || !gate.authorized) {
      return () => {
        controller.abort();
      };
    }

    if (initialFetchedForApplicationRef.current === applicationId) {
      return () => {
        controller.abort();
      };
    }

    initialFetchedForApplicationRef.current = applicationId;
    setLoading(true);

    void (async () => {
      try {
        await fetchPage(null, { append: false, generation, signal: controller.signal });
      } catch {
        if (!controller.signal.aborted && generation === requestGenerationRef.current) {
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted && generation === requestGenerationRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [applicationId, fetchPage, gate.authorized, gate.loading]);

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    if (consumedCursorsRef.current.has(nextCursor) || inFlightCursorsRef.current.has(nextCursor)) {
      return;
    }

    const cursor = nextCursor;
    inFlightCursorsRef.current.add(cursor);
    setLoadingMore(true);

    const generation = requestGenerationRef.current;
    const controller = new AbortController();

    try {
      await fetchPage(cursor, { append: true, generation, signal: controller.signal });
      if (generation === requestGenerationRef.current) {
        consumedCursorsRef.current.add(cursor);
      }
    } catch {
      if (generation === requestGenerationRef.current) {
        setError(true);
      }
    } finally {
      inFlightCursorsRef.current.delete(cursor);
      if (generation === requestGenerationRef.current) {
        setLoadingMore(false);
      }
    }
  }

  const statusText = loading
    ? LOADING_COPY
    : error
      ? LOAD_ERROR_COPY
      : events.length === 0
        ? EMPTY_COPY
        : undefined;

  return (
    <section
      aria-label="Lifecycle audit history"
      data-testid={`design-partner-lifecycle-audit-${applicationId}`}
      style={{ marginTop: "0.25rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border)" }}
    >
      <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, marginBottom: "0.45rem" }}>
        Lifecycle history
      </div>

      <p
        data-testid="design-partner-lifecycle-audit-notice"
        style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0 0 0.55rem", lineHeight: 1.5 }}
      >
        {INCOMPLETE_HISTORY_COPY}
      </p>

      <div
        role="status"
        aria-live="polite"
        data-testid="design-partner-lifecycle-audit-status"
        style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "0.55rem" }}
      >
        {statusText}
      </div>

      {events.length > 0 && (
        <ol
          data-testid="design-partner-lifecycle-audit-list"
          style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.55rem" }}
        >
          {events.map((event, index) => (
            <li
              key={`${event.occurred_at}-${event.event_type}-${index}`}
              data-testid={`design-partner-lifecycle-audit-item-${index}`}
              style={{
                padding: "0.55rem 0.65rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                display: "grid",
                gap: "0.25rem",
              }}
            >
              <div style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700 }}>
                {EVENT_LABELS[event.event_type]}
              </div>
              <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
                {event.from_status} → {event.to_status}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                {formatOccurredAt(event.occurred_at)} · {event.operator_label}
              </div>
              {event.promoted_partner_id && (
                <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
                  Partner ID: {event.promoted_partner_id}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {nextCursor && !loading && (
        <button
          type="button"
          data-testid="design-partner-lifecycle-audit-load-more"
          onClick={() => void handleLoadMore()}
          disabled={loadingMore}
          style={{
            marginTop: "0.65rem",
            fontFamily: FONT,
            fontSize: "0.72rem",
            fontWeight: 700,
            padding: "0.45rem 0.75rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-primary)",
            cursor: loadingMore ? "not-allowed" : "pointer",
          }}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </section>
  );
}
