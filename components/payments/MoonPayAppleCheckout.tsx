"use client";
// FILE: components/payments/MoonPayAppleCheckout.tsx
// Headless MoonPay Apple Pay — session → connect → quote → Apple Pay frame.

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, type ApplePayEvent } from "@moonpay/platform-sdk-web";
import { Spinner } from "@/components/ui/Spinner";
import { ContactlessPayIcon } from "@/components/ui/WalletPassIcon";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

type Phase = "idle" | "session" | "connect" | "ready" | "paying" | "done" | "error";

export function MoonPayAppleCheckout({
  amountUsd,
  suiAddress,
  bookingId,
  email,
  onComplete,
  onError,
  compact = false,
}: {
  amountUsd: number;
  suiAddress?: string | null;
  bookingId?: string;
  email?: string;
  onComplete?: (payload: { moonpayTxnId?: string; bookingId?: string }) => void;
  onError?: (message: string) => void;
  compact?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const applePayRef = useRef<HTMLDivElement>(null);
  const connectRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);

  const reconcileBooking = useCallback(async () => {
    if (!bookingId) return;
    try {
      await fetch("/api/cielo/payment/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, scan_events: true }),
      });
    } catch {
      // Non-fatal — on-chain delivery may lag
    }
  }, [bookingId]);

  const startCheckout = useCallback(async () => {
    if (!suiAddress) {
      const m = "Sign in with Google first — we'll handle the rest at checkout.";
      setMsg(m);
      setPhase("error");
      onError?.(m);
      return;
    }

    setPhase("session");
    setMsg(null);

    try {
      const sessionRes = await fetch("/api/payments/moonpay-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sui_address: suiAddress, email }),
      });
      const sessionData = await sessionRes.json() as {
        ok?: boolean;
        configured?: boolean;
        sessionToken?: string;
        destinationAssetCode?: string;
        message?: string;
      };

      if (!sessionData.configured || !sessionData.sessionToken) {
        const m = sessionData.message ?? "Card checkout is being enabled.";
        setMsg(m);
        setPhase("error");
        onError?.(m);
        return;
      }

      const client = createClient({
        sessionToken: sessionData.sessionToken,
        theme: { appearance: "dark" },
      });

      const connectionResult = await client.getConnection();
      if (!connectionResult.ok) {
        const m = "Could not connect to checkout. Try again in a moment.";
        setMsg(m);
        setPhase("error");
        onError?.(m);
        return;
      }

      if (connectionResult.value.status === "connectionRequired") {
        setPhase("connect");
        const connectContainer = connectRef.current;
        if (!connectContainer) {
          setMsg("Checkout UI not ready.");
          setPhase("error");
          return;
        }

        const connectResult = await client.connect({
          container: connectContainer,
          theme: { appearance: "dark" },
        });

        if (!connectResult.ok) {
          setMsg("Could not open MoonPay connect.");
          setPhase("error");
          return;
        }
        connectResult.value.dispose();
      }

      const quoteResult = await client.getQuote({
        source: { asset: { code: "USD" }, amount: amountUsd.toFixed(2) },
        destination: { asset: { code: sessionData.destinationAssetCode ?? "USDC" } },
        wallet: { address: suiAddress },
        paymentMethod: { type: "apple_pay" },
      });

      if (!quoteResult.ok || !quoteResult.value.data.executable) {
        setMsg("Could not get a checkout quote. Try again shortly.");
        setPhase("error");
        onError?.("Quote unavailable");
        return;
      }

      const container = applePayRef.current;
      if (!container) {
        setMsg("Apple Pay container not ready.");
        setPhase("error");
        return;
      }

      setPhase("ready");

      const applePayResult = await client.setupApplePay({
        quote: quoteResult.value.data.signature,
        container,
        onEvent: async (event: ApplePayEvent) => {
          switch (event.kind) {
            case "ready":
              setPhase("ready");
              break;
            case "complete": {
              const txn = event.payload.transaction;
              if (txn.status === "failed") {
                const reason = "failureReason" in txn ? txn.failureReason : "Payment failed.";
                setMsg(reason);
                setPhase("error");
                onError?.(reason);
                break;
              }
              setPhase("done");
              setMsg("Payment accepted — confirming your booking…");
              await reconcileBooking();
              onComplete?.({ moonpayTxnId: txn.id, bookingId });
              break;
            }
            case "quoteExpired":
              setMsg("Quote expired — tap to try again.");
              setPhase("error");
              break;
            case "unsupported":
              setMsg("Apple Pay isn't available in this browser.");
              setPhase("error");
              break;
            case "error":
              setMsg(event.payload.message);
              setPhase("error");
              onError?.(event.payload.message);
              break;
          }
        },
      });

      if (!applePayResult.ok) {
        setMsg("Could not initialize Apple Pay.");
        setPhase("error");
        onError?.("Apple Pay setup failed");
      } else {
        setPhase("paying");
      }
    } catch {
      const m = "Checkout error. We'll send a payment link by email.";
      setMsg(m);
      setPhase("error");
      onError?.(m);
    }
  }, [amountUsd, suiAddress, email, bookingId, onComplete, onError, reconcileBooking]);

  useEffect(() => {
    if (initRef.current || !suiAddress) return;
    initRef.current = true;
    void startCheckout();
  }, [suiAddress, startCheckout]);

  return (
    <div style={{ marginBottom: compact ? 0 : "0.85rem" }}>
      {!compact && (
        <div style={{
          fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "var(--text-muted)", marginBottom: "0.5rem",
        }}>
          Payment
        </div>
      )}

      <div style={{
        padding: compact ? "0.65rem 0" : "0.85rem",
        borderRadius: 14,
        background: compact ? "transparent" : "rgba(59,130,246,0.06)",
        border: compact ? "none" : "1px solid rgba(59,130,246,0.22)",
      }}>
        <div style={{
          fontFamily: FONT,
          fontSize: compact ? "0.82rem" : "0.92rem",
          fontWeight: 800,
          color: "var(--text-primary)",
          marginBottom: "0.35rem",
        }}>
          Pay with Apple Pay — we handle the rest
        </div>
        <p style={{
          fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)",
          margin: "0 0 0.65rem", lineHeight: 1.6,
        }}>
          Pay <strong style={{ color: "var(--text-primary)" }}>${amountUsd.toFixed(2)}</strong>
          {" "}in your currency. Conversion and delivery happen automatically.
        </p>

        {(phase === "session" || phase === "connect") && (
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)",
            marginBottom: "0.65rem",
          }}>
            <Spinner size={16} color="#10B981" />
            {phase === "connect" ? "Connecting secure checkout…" : "Preparing checkout…"}
          </div>
        )}

        {/* MoonPay connect frame (shown only when needed) */}
        <div
          ref={connectRef}
          style={{
            display: phase === "connect" ? "block" : "none",
            minHeight: phase === "connect" ? 320 : 0,
            marginBottom: "0.65rem",
            borderRadius: 12,
            overflow: "hidden",
          }}
        />

        {/* MoonPay renders the native Apple Pay button here */}
        <div
          ref={applePayRef}
          style={{
            minHeight: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />

        {!suiAddress && (
          <button type="button" onClick={startCheckout}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              width: "100%", justifyContent: "center",
              padding: "0.7rem 1.25rem", borderRadius: 999, border: "none",
              background: "#000", color: "#fff",
              fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700,
              cursor: "pointer", minHeight: 48,
            }}>
            <ContactlessPayIcon size={18} color="#fff" />
            Sign in to pay with Apple Pay
          </button>
        )}

        {phase === "error" && (
          <button type="button" onClick={() => { initRef.current = false; void startCheckout(); }}
            style={{
              marginTop: "0.5rem", background: "none", border: "none", padding: 0,
              cursor: "pointer", fontFamily: FONT, fontSize: "0.72rem",
              color: "#10B981", fontWeight: 600,
            }}>
            Try again →
          </button>
        )}

        {msg && (
          <p style={{
            fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
            margin: "0.5rem 0 0", lineHeight: 1.5,
          }}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
