"use client";

import { useId, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import {
  GOOD_TROUBLE_PURCHASE_DOB_CONTINUE,
  GOOD_TROUBLE_PURCHASE_DOB_INTRO,
} from "@/lib/partner/goodTroublePurchaseFlow";

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

export function GoodTroublePurchaseDobForm({
  busy,
  error,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  onSubmit: (isoDate: string) => void;
}) {
  const monthId = useId();
  const dayId = useId();
  const yearId = useId();
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit() {
    const iso = composeIsoDate(month, day, year);
    if (!iso) {
      setLocalError("Enter a valid date of birth.");
      return;
    }
    setLocalError(null);
    onSubmit(iso);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.65 }}>
        {GOOD_TROUBLE_PURCHASE_DOB_INTRO}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "0.65rem",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.78rem" }}>
          Month
          <input
            id={monthId}
            inputMode="numeric"
            aria-label="Month"
            placeholder="MM"
            maxLength={2}
            value={month}
            onChange={(e) => setMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
            style={{ padding: "0.65rem", borderRadius: 8, border: "1px solid var(--border)" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.78rem" }}>
          Day
          <input
            id={dayId}
            inputMode="numeric"
            aria-label="Day"
            placeholder="DD"
            maxLength={2}
            value={day}
            onChange={(e) => setDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
            style={{ padding: "0.65rem", borderRadius: 8, border: "1px solid var(--border)" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.78rem" }}>
          Year
          <input
            id={yearId}
            inputMode="numeric"
            aria-label="Year"
            placeholder="YYYY"
            maxLength={4}
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            style={{ padding: "0.65rem", borderRadius: 8, border: "1px solid var(--border)" }}
          />
        </label>
      </div>
      <Btn disabled={busy} onClick={handleSubmit}>
        {busy ? "Checking…" : GOOD_TROUBLE_PURCHASE_DOB_CONTINUE}
      </Btn>
      {(localError || error) && (
        <p role="alert" style={{ margin: 0, color: "var(--text-secondary)" }}>
          {localError ?? error}
        </p>
      )}
    </div>
  );
}
