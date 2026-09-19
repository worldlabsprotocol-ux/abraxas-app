export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { assertDemoRuntimeBoot } = await import("@/lib/product/demoRuntime");
  assertDemoRuntimeBoot();
}
