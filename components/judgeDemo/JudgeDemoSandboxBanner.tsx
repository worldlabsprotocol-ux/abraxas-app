import { isPublicDemoClientSurface } from "@/lib/product/demoRuntime";

export function DemoEnvironmentBanner() {
  if (!isPublicDemoClientSurface()) {
    return null;
  }

  return (
    <div
      role="status"
      data-testid="demo-environment-banner"
      style={{
        background: "#061018",
        color: "#E2E8F0",
        fontFamily: "var(--font-sans), system-ui, sans-serif",
        fontSize: "0.78rem",
        letterSpacing: "0.02em",
        padding: "0.55rem 1rem",
        textAlign: "center",
        borderBottom: "1px solid rgba(45, 212, 191, 0.28)",
      }}
    >
      DEMO environment · Isolated test data · Same public Abraxas product
    </div>
  );
}
