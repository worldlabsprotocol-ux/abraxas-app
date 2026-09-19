"use client";
// FILE: app/global-error.tsx
// Root branded failure. Replaces the default Vercel 500 HTML.

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#07080c", color: "#e8eaf2", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <main style={{ maxWidth: 560, margin: "18vh auto", padding: "0 1.25rem" }}>
          <p style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontSize: "0.68rem", color: "#9aa3b8" }}>
            Abraxas
          </p>
          <h1 style={{ fontSize: "1.45rem", margin: "0.55rem 0 0.75rem" }}>This surface could not load</h1>
          <p style={{ color: "#c3c8d6", lineHeight: 1.65, fontSize: "0.92rem" }}>
            The server failed closed. Try again, or open another public page from the home navigation.
            This message never includes secrets, receipts, keys, or wallet details.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1.1rem",
              padding: "0.55rem 0.9rem",
              borderRadius: 10,
              border: "1px solid rgba(129,140,248,0.45)",
              background: "rgba(99,102,241,0.16)",
              color: "#e8eaf2",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
