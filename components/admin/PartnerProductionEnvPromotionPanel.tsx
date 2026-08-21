"use client";
// FILE: components/admin/PartnerProductionEnvPromotionPanel.tsx
// Production-only partner environment promotion — server RPC is authoritative.

import { useState } from "react";
import { adminFetch } from "@/lib/admin/adminFetch";
import { shouldUseProductionBrowserSessionAdminUi } from "@/lib/admin/productionAdminSessionUi";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";
const WARN = "#f87171";

type PromotionResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  partner_id?: string;
  allowed_environments?: string[];
  status?: string;
  already_production_enabled?: boolean;
  already_reversed?: boolean;
  audit_event_id?: string | null;
};

export function PartnerProductionEnvPromotionPanel() {
  const productionOnly = shouldUseProductionBrowserSessionAdminUi();
  const [partnerId, setPartnerId] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [returnUrl, setReturnUrl] = useState("");
  const [confirmPartnerId, setConfirmPartnerId] = useState("");
  const [reverseConfirmPartnerId, setReverseConfirmPartnerId] = useState("");
  const [activateOpen, setActivateOpen] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [activateLoading, setActivateLoading] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [activateMessage, setActivateMessage] = useState("");
  const [reverseMessage, setReverseMessage] = useState("");
  const [activateError, setActivateError] = useState("");
  const [reverseError, setReverseError] = useState("");

  if (!productionOnly) {
    return (
      <section
        aria-label="Production environment promotion"
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: "1rem 1.1rem",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", margin: 0 }}>
          Production environment promotion is available on the canonical Production deployment only.
        </p>
      </section>
    );
  }

  async function submitActivate() {
    setActivateLoading(true);
    setActivateError("");
    setActivateMessage("");
    try {
      const res = await adminFetch("/api/admin/partners/production-environment/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: partnerId.trim(),
          confirm_partner_id: confirmPartnerId.trim(),
          policy_id: policyId.trim(),
          return_url: returnUrl.trim(),
        }),
      });
      const data = await res.json() as PromotionResponse;
      if (!res.ok) {
        setActivateError(data.error ?? "Activation failed.");
        return;
      }
      setActivateMessage(
        data.already_production_enabled
          ? "Partner already production-enabled."
          : "Production environment enabled. Issue a new live key manually when ready.",
      );
      setActivateOpen(false);
      setConfirmPartnerId("");
    } catch {
      setActivateError("Activation request failed.");
    } finally {
      setActivateLoading(false);
    }
  }

  async function submitReverse() {
    setReverseLoading(true);
    setReverseError("");
    setReverseMessage("");
    try {
      const res = await adminFetch("/api/admin/partners/production-environment/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: partnerId.trim(),
          confirm_partner_id: reverseConfirmPartnerId.trim(),
        }),
      });
      const data = await res.json() as PromotionResponse;
      if (!res.ok) {
        setReverseError(data.error ?? "Reversal failed.");
        return;
      }
      setReverseMessage(
        data.already_reversed
          ? "Partner already in sandbox-only pilot state with no active live keys."
          : "Production environment reversed. Active live keys were revoked; issue a new live key after re-activation.",
      );
      setReverseOpen(false);
      setReverseConfirmPartnerId("");
    } catch {
      setReverseError("Reversal request failed.");
    } finally {
      setReverseLoading(false);
    }
  }

  const canOpenActivate = partnerId.trim() && policyId.trim() && returnUrl.trim();

  return (
    <section
      aria-label="Production environment promotion"
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "1rem 1.1rem",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.35rem" }}>
        Production environment promotion
      </h2>
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "rgba(255,255,255,0.55)", margin: "0 0 1rem", lineHeight: 1.5 }}>
        Preflight above is preview only — the server decides on submit. No live key is issued automatically.
      </p>

      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontFamily: FONT, fontSize: "0.74rem", color: "rgba(255,255,255,0.65)" }}>Partner ID</span>
          <input
            value={partnerId}
            onChange={(event) => setPartnerId(event.target.value)}
            placeholder="partner_id"
            autoComplete="off"
            style={{
              padding: "0.6rem 0.75rem",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "#f0f0f0",
              fontFamily: MONO,
              fontSize: "0.78rem",
            }}
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontFamily: FONT, fontSize: "0.74rem", color: "rgba(255,255,255,0.65)" }}>Policy ID</span>
          <input
            value={policyId}
            onChange={(event) => setPolicyId(event.target.value)}
            placeholder="policy_id"
            autoComplete="off"
            style={{
              padding: "0.6rem 0.75rem",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "#f0f0f0",
              fontFamily: MONO,
              fontSize: "0.78rem",
            }}
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontFamily: FONT, fontSize: "0.74rem", color: "rgba(255,255,255,0.65)" }}>Return URL</span>
          <input
            value={returnUrl}
            onChange={(event) => setReturnUrl(event.target.value)}
            placeholder="https://…"
            autoComplete="off"
            style={{
              padding: "0.6rem 0.75rem",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "#f0f0f0",
              fontFamily: MONO,
              fontSize: "0.78rem",
            }}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={!canOpenActivate || activateLoading}
          onClick={() => setActivateOpen(true)}
          style={{
            padding: "0.62rem 1rem",
            borderRadius: 8,
            border: "none",
            background: ACCENT,
            color: "#000",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: "0.8rem",
            cursor: !canOpenActivate ? "not-allowed" : "pointer",
            opacity: !canOpenActivate ? 0.5 : 1,
          }}
        >
          Enable production environment
        </button>
        <button
          type="button"
          disabled={!partnerId.trim() || reverseLoading}
          onClick={() => setReverseOpen(true)}
          style={{
            padding: "0.62rem 1rem",
            borderRadius: 8,
            border: `1px solid ${WARN}66`,
            background: "transparent",
            color: WARN,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: "0.8rem",
            cursor: !partnerId.trim() ? "not-allowed" : "pointer",
            opacity: !partnerId.trim() ? 0.5 : 1,
          }}
        >
          Reverse production environment
        </button>
      </div>

      {activateMessage && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, margin: "0.85rem 0 0" }}>{activateMessage}</p>
      )}
      {activateError && (
        <p role="alert" style={{ fontFamily: FONT, fontSize: "0.78rem", color: WARN, margin: "0.85rem 0 0" }}>{activateError}</p>
      )}
      {reverseMessage && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, margin: "0.85rem 0 0" }}>{reverseMessage}</p>
      )}
      {reverseError && (
        <p role="alert" style={{ fontFamily: FONT, fontSize: "0.78rem", color: WARN, margin: "0.85rem 0 0" }}>{reverseError}</p>
      )}

      {activateOpen && (
        <div
          role="dialog"
          aria-label="Confirm production environment activation"
          style={{
            marginTop: "1rem",
            padding: "1rem",
            borderRadius: 10,
            border: `1px solid ${ACCENT}44`,
            background: "rgba(16,185,129,0.06)",
          }}
        >
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#D1FAE5", margin: "0 0 0.75rem" }}>
            Type the exact partner ID to enable production for this partner.
          </p>
          <input
            value={confirmPartnerId}
            onChange={(event) => setConfirmPartnerId(event.target.value)}
            placeholder="partner_id"
            autoComplete="off"
            style={{
              width: "100%",
              padding: "0.6rem 0.75rem",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "#f0f0f0",
              fontFamily: MONO,
              fontSize: "0.78rem",
              marginBottom: "0.75rem",
            }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              disabled={activateLoading || confirmPartnerId.trim() !== partnerId.trim()}
              onClick={() => void submitActivate()}
              style={{
                padding: "0.55rem 0.9rem",
                borderRadius: 8,
                border: "none",
                background: ACCENT,
                color: "#000",
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              {activateLoading ? "Submitting…" : "Confirm activation"}
            </button>
            <button
              type="button"
              onClick={() => { setActivateOpen(false); setConfirmPartnerId(""); }}
              style={{
                padding: "0.55rem 0.9rem",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent",
                color: "#f0f0f0",
                fontFamily: FONT,
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {reverseOpen && (
        <div
          role="dialog"
          aria-label="Confirm production environment reversal"
          style={{
            marginTop: "1rem",
            padding: "1rem",
            borderRadius: 10,
            border: `1px solid ${WARN}44`,
            background: "rgba(248,113,113,0.06)",
          }}
        >
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#fecaca", margin: "0 0 0.75rem" }}>
            This revokes all active live keys and returns the partner to sandbox-only pilot. Type the exact partner ID.
          </p>
          <input
            value={reverseConfirmPartnerId}
            onChange={(event) => setReverseConfirmPartnerId(event.target.value)}
            placeholder="partner_id"
            autoComplete="off"
            style={{
              width: "100%",
              padding: "0.6rem 0.75rem",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "#f0f0f0",
              fontFamily: MONO,
              fontSize: "0.78rem",
              marginBottom: "0.75rem",
            }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              disabled={reverseLoading || reverseConfirmPartnerId.trim() !== partnerId.trim()}
              onClick={() => void submitReverse()}
              style={{
                padding: "0.55rem 0.9rem",
                borderRadius: 8,
                border: "none",
                background: WARN,
                color: "#000",
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              {reverseLoading ? "Submitting…" : "Confirm reversal"}
            </button>
            <button
              type="button"
              onClick={() => { setReverseOpen(false); setReverseConfirmPartnerId(""); }}
              style={{
                padding: "0.55rem 0.9rem",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent",
                color: "#f0f0f0",
                fontFamily: FONT,
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
