"use client";
// FILE: components/payments/MoonPayAppleCheckout.tsx
// Headless MoonPay Apple Pay per Platform docs:
// session → getConnection → (guest checkout | connect) → quote → Apple Pay → challenge? → poll

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createClient,
  type ApplePayEvent,
  type ChallengeEvent,
  type Client,
  type ConnectEvent,
} from "@moonpay/platform-sdk-web";
import { Spinner } from "@/components/ui/Spinner";
import { ContactlessPayIcon } from "@/components/ui/WalletPassIcon";
import { MoonPayApplePayDisclosure } from "@/components/payments/MoonPayApplePayDisclosure";
import { pollMoonPayTransaction } from "@/lib/payments/moonpayPoll";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

type Phase =
  | "idle"
  | "session"
  | "connect"
  | "quote"
  | "ready"
  | "paying"
  | "challenge"
  | "polling"
  | "done"
  | "error";

type ApplePayFrameHandle = { dispose: () => void; setQuote: (sig: string) => void };

export function MoonPayAppleCheckout({
  amountUsd,
  suiAddress,
  bookingId,
  email,
  phoneNumber,
  onComplete,
  onError,
  compact = false,
}: {
  amountUsd: number;
  suiAddress?: string | null;
  bookingId?: string;
  email?: string;
  phoneNumber?: string;
  onComplete?: (payload: { moonpayTxnId?: string; bookingId?: string }) => void;
  onError?: (message: string) => void;
  compact?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [testMode, setTestMode] = useState(false);

  const applePayRef = useRef<HTMLDivElement>(null);
  const connectRef = useRef<HTMLDivElement>(null);
  const challengeRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<Client | null>(null);
  const applePayFrameRef = useRef<ApplePayFrameHandle | null>(null);
  const initRef = useRef(false);

  const guestCheckoutReady = Boolean(email?.trim() && phoneNumber?.trim() && termsAccepted);

  const reconcileBooking = useCallback(async () => {
    if (!bookingId) return;
    try {
      await fetch("/api/cielo/payment/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, scan_events: true }),
      });
    } catch {
      // On-chain delivery may lag MoonPay settlement
    }
  }, [bookingId]);

  const openChallenge = useCallback(async (
    client: Client,
    challengeUrl: string,
    onResolved: (txnId?: string) => void,
  ) => {
    const container = challengeRef.current;
    if (!container) {
      setMsg("Verification UI not ready.");
      setPhase("error");
      return;
    }

    setPhase("challenge");
    const url = new URL(challengeUrl);
    if (!url.searchParams.has("channelId")) {
      url.searchParams.set("channelId", crypto.randomUUID());
    }

    const challengeResult = await client.setupChallenge({
      url: url.toString(),
      container,
      onEvent: (event: ChallengeEvent) => {
        switch (event.kind) {
          case "complete": {
            applePayFrameRef.current?.dispose();
            applePayFrameRef.current = null;
            if (event.payload.flow === "buy") {
              onResolved(event.payload.transaction.id);
            } else {
              onResolved(undefined);
            }
            break;
          }
          case "cancelled":
            applePayFrameRef.current?.dispose();
            applePayFrameRef.current = null;
            setMsg("Verification cancelled. Try again when ready.");
            setPhase("error");
            break;
          case "error":
            applePayFrameRef.current?.dispose();
            applePayFrameRef.current = null;
            setMsg("Verification failed. Try again.");
            setPhase("error");
            onError?.("Challenge failed");
            break;
        }
      },
    });

    if (!challengeResult.ok) {
      setMsg("Could not open verification.");
      setPhase("error");
    }
  }, [onError]);

  const fetchQuote = useCallback(async (
    client: Client,
    walletAddress: string,
    assetCode: string,
  ) => {
    return client.getQuote({
      source: { asset: { code: "USD" }, amount: amountUsd.toFixed(2) },
      destination: { asset: { code: assetCode } },
      wallet: { address: walletAddress },
      paymentMethod: { type: "apple_pay" },
    });
  }, [amountUsd]);

  const setupApplePay = useCallback(async (
    client: Client,
    quoteSignature: string,
    walletAddress: string,
    assetCode: string,
  ) => {
    const container = applePayRef.current;
    if (!container) {
      setMsg("Apple Pay container not ready.");
      setPhase("error");
      return;
    }

    setPhase("ready");

    const applePayResult = await client.setupApplePay({
      quote: quoteSignature,
      container,
      onEvent: async (event: ApplePayEvent) => {
        switch (event.kind) {
          case "ready":
            setPhase("paying");
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

            const txnId = txn.id;
            if (!txnId) {
              setPhase("done");
              setMsg("Payment accepted — confirming your booking…");
              await reconcileBooking();
              onComplete?.({ bookingId });
              break;
            }

            setPhase("polling");
            setMsg("Payment processing — confirming delivery…");
            const poll = await pollMoonPayTransaction(client, txnId);
            if (poll.ok) {
              setPhase("done");
              setMsg("Payment complete — confirming your booking…");
              await reconcileBooking();
              onComplete?.({ moonpayTxnId: txnId, bookingId });
            } else if (poll.status === "failed") {
              setMsg("Payment failed during processing.");
              setPhase("error");
              onError?.("Transaction failed");
            } else {
              setPhase("done");
              setMsg("Payment submitted — we'll confirm when settlement completes.");
              await reconcileBooking();
              onComplete?.({ moonpayTxnId: txnId, bookingId });
            }
            break;
          }

          case "challenge":
            await openChallenge(client, event.payload.url, async txnId => {
              if (txnId) {
                setPhase("polling");
                const poll = await pollMoonPayTransaction(client, txnId);
                if (poll.ok || poll.status === "pending") {
                  setPhase("done");
                  setMsg("Payment complete — confirming your booking…");
                  await reconcileBooking();
                  onComplete?.({ moonpayTxnId: txnId, bookingId });
                } else {
                  setMsg("Payment failed during verification.");
                  setPhase("error");
                }
              }
            });
            break;

          case "quoteExpired": {
            const refreshed = await fetchQuote(client, walletAddress, assetCode);
            if (refreshed.ok && refreshed.value.data.executable) {
              applePayFrameRef.current?.setQuote(refreshed.value.data.signature);
            } else {
              setMsg("Quote expired — tap try again.");
              setPhase("error");
            }
            break;
          }

          case "unsupported":
            setMsg(testMode
              ? "Mock Apple Pay unavailable in this browser. Try Chrome or Safari."
              : "Apple Pay isn't available in this browser.");
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
      return;
    }

    applePayFrameRef.current = applePayResult.value;
  }, [bookingId, fetchQuote, onComplete, onError, openChallenge, reconcileBooking, testMode]);

  const ensureConnection = useCallback(async (
    client: Client,
    connection: { status: string; capabilities?: { guestCheckout?: unknown } },
  ): Promise<boolean> => {
    if (connection.status === "active") return true;

    // Guest checkout — skip connect when capability present and session has guest fields
    if (connection.capabilities?.guestCheckout && guestCheckoutReady) {
      return true;
    }

    if (connection.status !== "connectionRequired") {
      setMsg("Checkout unavailable for this account. Try again later.");
      return false;
    }

    const connectContainer = connectRef.current;
    if (!connectContainer) {
      setMsg("Checkout UI not ready.");
      return false;
    }

    setPhase("connect");

    return new Promise(resolve => {
      void client.connect({
        container: connectContainer,
        theme: { appearance: "dark" },
        onEvent: (event: ConnectEvent) => {
          if (event.kind === "complete") {
            const status = "status" in event.payload ? event.payload.status : undefined;
            resolve(status === "active" || status === "pending");
          }
          if (event.kind === "error") resolve(false);
        },
      }).then(result => {
        if (!result.ok) resolve(false);
      });
    });
  }, [guestCheckoutReady]);

  const startCheckout = useCallback(async () => {
    if (!suiAddress) {
      const m = "Sign in with Google first — we'll handle the rest at checkout.";
      setMsg(m);
      setPhase("error");
      onError?.(m);
      return;
    }

    if (email && phoneNumber && !termsAccepted) {
      setMsg("Accept MoonPay terms to continue with Apple Pay.");
      setPhase("idle");
      return;
    }

    setPhase("session");
    setMsg(null);

    try {
      const sessionRes = await fetch("/api/payments/moonpay-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sui_address: suiAddress,
          booking_id: bookingId,
          email: email?.trim(),
          phone_number: phoneNumber?.trim(),
          terms_accepted_at: termsAccepted ? new Date().toISOString() : undefined,
        }),
      });

      const sessionData = await sessionRes.json() as {
        ok?: boolean;
        configured?: boolean;
        sessionToken?: string;
        destinationAssetCode?: string;
        quoteWalletAddress?: string;
        testMode?: boolean;
        message?: string;
      };

      if (!sessionData.configured || !sessionData.sessionToken) {
        const m = sessionData.message ?? "Card checkout is being enabled.";
        setMsg(m);
        setPhase("error");
        onError?.(m);
        return;
      }

      setTestMode(Boolean(sessionData.testMode));

      const client = createClient({
        sessionToken: sessionData.sessionToken,
        theme: { appearance: "dark" },
      });
      clientRef.current = client;

      const connectionResult = await client.getConnection();
      if (!connectionResult.ok) {
        setMsg("Could not connect to checkout. Try again in a moment.");
        setPhase("error");
        onError?.("Connection failed");
        return;
      }

      const connected = await ensureConnection(client, connectionResult.value);
      if (!connected) {
        setMsg("Could not complete MoonPay connection.");
        setPhase("error");
        return;
      }

      setPhase("quote");
      const walletAddress = sessionData.quoteWalletAddress || suiAddress;
      const assetCode = sessionData.destinationAssetCode ?? "USDC";

      const quoteResult = await fetchQuote(client, walletAddress, assetCode);
      if (!quoteResult.ok || !quoteResult.value.data.executable) {
        const hint = sessionData.testMode
          ? " Test mode: set MOONPAY_TEST_DESTINATION_ASSET=SOL and MOONPAY_TEST_WALLET."
          : "";
        setMsg(`Could not get a checkout quote.${hint}`);
        setPhase("error");
        onError?.("Quote unavailable");
        return;
      }

      await setupApplePay(client, quoteResult.value.data.signature, walletAddress, assetCode);
    } catch {
      const m = "Checkout error. We'll send a payment link by email.";
      setMsg(m);
      setPhase("error");
      onError?.(m);
    }
  }, [
    suiAddress, email, phoneNumber, termsAccepted, bookingId,
    onError, ensureConnection, fetchQuote, setupApplePay,
  ]);

  useEffect(() => {
    return () => {
      applePayFrameRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (initRef.current || !suiAddress) return;
    if (phoneNumber && !termsAccepted) return;
    initRef.current = true;
    void startCheckout();
  }, [suiAddress, phoneNumber, termsAccepted, startCheckout]);

  const showGuestFields = Boolean(email && !phoneNumber);

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
          {testMode && (
            <span style={{ display: "block", marginTop: 4, fontSize: "0.65rem", color: "var(--text-muted)" }}>
              Test mode — mock Apple Pay button (Ok/Cancel dialog).
            </span>
          )}
        </p>

        <MoonPayApplePayDisclosure
          compact={compact}
          showCheckbox={Boolean(email)}
          accepted={termsAccepted}
          onAcceptChange={v => {
            setTermsAccepted(v);
            if (v && suiAddress && !initRef.current) {
              initRef.current = true;
              void startCheckout();
            }
          }}
        />

        {showGuestFields && (
          <p style={{
            fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
            margin: "0 0 0.65rem", lineHeight: 1.5,
          }}>
            Guest checkout: add phone in E.164 format (e.g. +14155551234) on the contact step for one-tap Apple Pay without a MoonPay account.
          </p>
        )}

        {(phase === "session" || phase === "connect" || phase === "quote" || phase === "polling") && (
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)",
            marginBottom: "0.65rem",
          }}>
            <Spinner size={16} color="#10B981" />
            {phase === "connect" && "Connecting secure checkout…"}
            {phase === "quote" && "Getting quote…"}
            {phase === "polling" && "Confirming payment…"}
            {phase === "session" && "Preparing checkout…"}
          </div>
        )}

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

        <div
          ref={challengeRef}
          style={{
            display: phase === "challenge" ? "block" : "none",
            minHeight: phase === "challenge" ? 360 : 0,
            marginBottom: "0.65rem",
            borderRadius: 12,
            overflow: "hidden",
          }}
        />

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
