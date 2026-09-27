"use client";
// FILE: components/admin/PartnerMeteringPanel.tsx
// Admin partner usage and estimate-only commercial planning.

import { useCallback, useEffect, useState } from "react";
import type { ProductionAdminRequest } from "@/lib/admin/productionAdminSessionUi";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

function formatUsd(cents: number | null): string {
  if (cents == null) return "Custom contract";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

interface MeteringReport {
  partner_id: string;
  observe_only: boolean;
  enforcement_mode: string;
  plan_id: string;
  commercial_estimate: {
    plan_id: string;
    plan_label: string;
    currency: "USD";
    estimate_only: true;
    collection_status: "not_enabled";
    estimated_base_cents: number | null;
    estimated_receipt_overage_cents: number | null;
    estimated_api_overage_cents: number | null;
    estimated_total_cents: number | null;
  };
  totals: {
    partner_flow_receipt_issued: number;
    partner_api_call: number;
    total: number;
  };
  daily: Array<{
    date: string;
    partner_flow_receipt_issued: number;
    partner_api_call: number;
    total: number;
  }>;
  monthly: Array<{
    month: string;
    partner_flow_receipt_issued: number;
    partner_api_call: number;
    total: number;
  }>;
}

interface EntitlementsView {
  plan_id: string;
  enforcement_mode: string;
  monthly_receipt_limit: number | null;
  monthly_api_call_limit: number | null;
  observe_only: boolean;
  enforcement_label: string;
}

export function PartnerMeteringPanel({ adminRequest }: { adminRequest: ProductionAdminRequest }) {
  const [partnerId, setPartnerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metering, setMetering] = useState<MeteringReport | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementsView | null>(null);

  const load = useCallback(async () => {
    const id = partnerId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [meteringRes, entRes] = await Promise.all([
        adminRequest(`/api/admin/partners/metering?partner_id=${encodeURIComponent(id)}`, {
          cache: "no-store",
        }),
        adminRequest(`/api/admin/partners/entitlements?partner_id=${encodeURIComponent(id)}`, {
          cache: "no-store",
        }),
      ]);

      if (!meteringRes.ok) {
        const body = await meteringRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Metering load failed (${meteringRes.status})`);
      }

      const meteringBody = await meteringRes.json();
      setMetering(meteringBody.metering as MeteringReport);

      if (entRes.ok) {
        const entBody = await entRes.json();
        setEntitlements(entBody.entitlements as EntitlementsView);
      } else {
        setEntitlements(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load metering");
      setMetering(null);
      setEntitlements(null);
    } finally {
      setLoading(false);
    }
  }, [adminRequest, partnerId]);

  useEffect(() => {
    if (partnerId.trim()) void load();
  }, [load, partnerId]);

  return (
    <section aria-label="Partner usage metering">
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.55, marginBottom: "1rem" }}>
        Billable-quality usage and an estimate from the selected commercial plan. Estimates do not charge or block partners.
        Public receipt views are excluded from metering.
      </p>

      <label style={{ display: "block", marginBottom: "0.75rem" }}>
        <span style={{ fontFamily: FONT, fontSize: "0.75rem", color: "rgba(255,255,255,0.55)" }}>Partner ID</span>
        <input
          value={partnerId}
          onChange={e => setPartnerId(e.target.value)}
          placeholder="your-protocol-partner"
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            padding: "0.5rem 0.75rem",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "#f0f0f0",
            fontFamily: MONO,
            fontSize: "0.72rem",
          }}
        />
      </label>

      {loading && <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>Loading…</p>}
      {error && <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#f87171" }}>{error}</p>}

      {metering && (
        <div style={{ marginTop: "1rem" }}>
          <div
            style={{
              padding: "0.9rem 1rem",
              borderRadius: 10,
              border: "1px solid rgba(16,185,129,0.25)",
              background: "rgba(16,185,129,0.06)",
              marginBottom: "1rem",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 700 }}>
              {metering.commercial_estimate.plan_label} · {formatUsd(metering.commercial_estimate.estimated_total_cents)}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "rgba(255,255,255,0.65)", margin: "0.35rem 0 0" }}>
              {metering.commercial_estimate.collection_status === "not_enabled"
                ? "Estimate only. Billing collection and usage enforcement are not enabled."
                : (entitlements?.enforcement_label ?? "Commercial usage estimate.")}
            </p>
            <p style={{ fontFamily: MONO, fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", margin: "0.5rem 0 0" }}>
              plan={metering.plan_id} · mode={metering.enforcement_mode} · base={formatUsd(metering.commercial_estimate.estimated_base_cents)} · receipt overage={formatUsd(metering.commercial_estimate.estimated_receipt_overage_cents)} · API overage={formatUsd(metering.commercial_estimate.estimated_api_overage_cents)}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
            {[
              ["Approved receipts issued", metering.totals.partner_flow_receipt_issued],
              ["Authenticated API calls", metering.totals.partner_api_call],
              ["Total billable events", metering.totals.total],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ padding: "0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)" }}>
                <div style={{ fontFamily: FONT, fontSize: "1.1rem", fontWeight: 700, color: ACCENT }}>{value}</div>
                <div style={{ fontFamily: FONT, fontSize: "0.7rem", color: "rgba(255,255,255,0.55)", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {metering.monthly.length > 0 && (
            <>
              <h3 style={{ fontFamily: FONT, fontSize: "0.85rem", marginBottom: "0.5rem" }}>Monthly aggregates</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: "0.68rem", marginBottom: "1rem" }}>
                <thead>
                  <tr style={{ color: "rgba(255,255,255,0.5)", textAlign: "left" }}>
                    <th style={{ padding: "0.35rem 0" }}>Month</th>
                    <th>Receipts</th>
                    <th>API calls</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {metering.monthly.map(row => (
                    <tr key={row.month}>
                      <td style={{ padding: "0.35rem 0" }}>{row.month}</td>
                      <td>{row.partner_flow_receipt_issued}</td>
                      <td>{row.partner_api_call}</td>
                      <td>{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {metering.daily.length > 0 && (
            <>
              <h3 style={{ fontFamily: FONT, fontSize: "0.85rem", marginBottom: "0.5rem" }}>Daily aggregates</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: "0.68rem" }}>
                <thead>
                  <tr style={{ color: "rgba(255,255,255,0.5)", textAlign: "left" }}>
                    <th style={{ padding: "0.35rem 0" }}>Date</th>
                    <th>Receipts</th>
                    <th>API calls</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {metering.daily.map(row => (
                    <tr key={row.date}>
                      <td style={{ padding: "0.35rem 0" }}>{row.date}</td>
                      <td>{row.partner_flow_receipt_issued}</td>
                      <td>{row.partner_api_call}</td>
                      <td>{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {metering.daily.length === 0 && metering.monthly.length === 0 && (
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>
              No billable metering events in the selected range.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
