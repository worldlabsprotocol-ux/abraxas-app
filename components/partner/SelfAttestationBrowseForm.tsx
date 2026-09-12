"use client";
// FILE: components/partner/SelfAttestationBrowseForm.tsx
// Good Trouble browse DOB-first setup — full DOB not retained client-side after submit.

import { useCallback, useEffect, useId, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { GOOD_TROUBLE_BROWSE_POLICY_ID } from "@/lib/goodTrouble/constants";

export interface SelfAttestationBrowseFormProps {
  partnerId: string;
  policyId?: string;
  partnerName: string;
  returnUrl: string;
  onConfirmed?: () => void;
  onUnder21?: () => void;
}

type SubmitResult =
  | { ok: true; age_band: "over_21" | "under_21" }
  | { ok: false; message: string };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function composeIsoDate(month: string, day: string, year: string): string | null {
  const m = Number(month);
  const d = Number(day);
  const y = Number(year);
  if (!Number.isInteger(m) || !Number.isInteger(d) || !Number.isInteger(y)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 9999) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function redirectWithBrowseReceipt(
  returnUrl: string,
  data: { browse_receipt: string; browse_receipt_id?: string; policy_id: string },
): boolean {
  try {
    const target = new URL(returnUrl);
    target.searchParams.set("browse_receipt", data.browse_receipt);
    if (data.browse_receipt_id) {
      target.searchParams.set("browse_receipt_id", data.browse_receipt_id);
    }
    target.searchParams.set("purpose", "browse");
    target.searchParams.set("policy_id", data.policy_id);
    window.location.replace(target.toString());
    return true;
  } catch {
    return false;
  }
}

export function SelfAttestationBrowseForm({
  partnerId,
  policyId = GOOD_TROUBLE_BROWSE_POLICY_ID,
  partnerName,
  returnUrl,
  onConfirmed,
  onUnder21,
}: SelfAttestationBrowseFormProps) {
  const monthId = useId();
  const dayId = useId();
  const yearId = useId();
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingReuse, setCheckingReuse] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const clearFields = useCallback(() => {
    setMonth("");
    setDay("");
    setYear("");
  }, []);

  useEffect(() => {
    if (!returnUrl) {
      setCheckingReuse(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/age-assurance/browse-reuse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            partner_id: partnerId,
            policy_id: policyId,
            return_url: returnUrl,
          }),
        });
        const data = await res.json() as {
          ok?: boolean;
          browse_receipt?: string;
          browse_receipt_id?: string;
          redirect_url?: string;
        };
        if (cancelled) return;
        if (res.ok && data.ok && data.browse_receipt) {
          if (data.redirect_url) {
            window.location.replace(data.redirect_url);
            return;
          }
          if (redirectWithBrowseReceipt(returnUrl, {
            browse_receipt: data.browse_receipt,
            browse_receipt_id: data.browse_receipt_id,
            policy_id: policyId,
          })) {
            return;
          }
        }
      } catch {
        // No reusable proof — show DOB form.
      } finally {
        if (!cancelled) setCheckingReuse(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [partnerId, policyId, returnUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const iso = composeIsoDate(month, day, year);
    if (!iso) {
      setError("We couldn't confirm your age. Check your birthday and try again.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/age-assurance/self-attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date_of_birth: iso,
          partner_id: partnerId,
          policy_id: policyId,
          purpose: "browse",
        }),
      });
      const data = await res.json() as {
        ok?: boolean;
        age_band?: "over_21" | "under_21";
        browse_receipt?: string;
        browse_receipt_id?: string;
        code?: string;
      };

      clearFields();

      if (!res.ok || !data.ok || !data.age_band) {
        setError("We couldn't confirm your age. Check your birthday and try again.");
        return;
      }

      if (data.age_band === "under_21") {
        setResult({ ok: true, age_band: "under_21" });
        onUnder21?.();
        return;
      }

      if (data.age_band === "over_21") {
        setResult({ ok: true, age_band: "over_21" });
        onConfirmed?.();
        if (returnUrl && data.browse_receipt) {
          redirectWithBrowseReceipt(returnUrl, {
            browse_receipt: data.browse_receipt,
            browse_receipt_id: data.browse_receipt_id,
            policy_id: policyId,
          });
        }
        return;
      }
    } catch {
      clearFields();
      setError("We couldn't confirm your age. Check your birthday and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (checkingReuse) {
    return <p role="status">Loading…</p>;
  }

  if (result?.ok && result.age_band === "over_21") {
    return (
      <StatusBanner tone="success" title="Your Passport is ready">
        You're confirmed as 21+. Your private Abraxas profile and wallet are ready for future visits.
        {returnUrl && (
          <div style={{ marginTop: "0.75rem" }}>
            <Btn variant="secondary" onClick={() => { window.location.href = returnUrl; }}>
              Continue to {partnerName}
            </Btn>
          </div>
        )}
      </StatusBanner>
    );
  }

  if (result?.ok && result.age_band === "under_21") {
    return (
      <StatusBanner tone="info" title="You must be 21+">
        You must be 21 or older to continue.
      </StatusBanner>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate autoComplete="off" data-form-type="other">
      <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem" }}>Confirm you&apos;re 21+</h2>
      <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
        Enter your birthday once. We&apos;ll save only that you&apos;re 21 or older—not your birthday.
      </p>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <label htmlFor={monthId} style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            Month
          </label>
          <input
            id={monthId}
            name="birth-month"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            maxLength={2}
            placeholder="MM"
            value={month}
            onChange={(e) => setMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
            aria-required="true"
            disabled={busy}
            style={{ width: "4.5rem", padding: "0.5rem" }}
          />
        </div>
        <div>
          <label htmlFor={dayId} style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            Day
          </label>
          <input
            id={dayId}
            name="birth-day"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            maxLength={2}
            placeholder="DD"
            value={day}
            onChange={(e) => setDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
            aria-required="true"
            disabled={busy}
            style={{ width: "4.5rem", padding: "0.5rem" }}
          />
        </div>
        <div>
          <label htmlFor={yearId} style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            Year
          </label>
          <input
            id={yearId}
            name="birth-year"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            maxLength={4}
            placeholder="YYYY"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            aria-required="true"
            disabled={busy}
            style={{ width: "5.5rem", padding: "0.5rem" }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        style={{
          padding: "0.7rem 1.3rem",
          borderRadius: 999,
          fontWeight: 700,
          cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.55 : 1,
        }}
      >
        {busy ? "Creating…" : "Create my Passport"}
      </button>

      {error && (
        <p role="alert" style={{ marginTop: "0.75rem", color: "var(--text-secondary)" }}>{error}</p>
      )}
    </form>
  );
}
