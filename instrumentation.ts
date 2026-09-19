export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { assertDemoRuntimeBoot, DemoRuntimeUnavailableError } = await import("@/lib/product/demoRuntime");
  try {
    assertDemoRuntimeBoot();
  } catch (error) {
    if (error instanceof DemoRuntimeUnavailableError) {
      console.error("demo_runtime.boot_failed", { fail_codes: error.fail_codes });
    }
    throw error;
  }
}
