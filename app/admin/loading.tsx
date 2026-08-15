// FILE: app/admin/loading.tsx
// Segment loading state for admin routes.

const FONT = "'Inter',system-ui,sans-serif";

export default function AdminLoading() {
  return (
    <div style={{
      minHeight: "40vh",
      display: "grid",
      placeItems: "center",
      padding: "2rem 1rem",
      background: "#0a0c10",
      color: "rgba(255,255,255,0.55)",
      fontFamily: FONT,
      fontSize: "0.85rem",
    }}>
      Loading admin console…
    </div>
  );
}
