export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { assertDemoRuntimeBoot, DemoRuntimeUnavailableError, shouldAssertDemoRuntimeAtBoot } =
    await import("@/lib/product/demoRuntime");
  const { assertInstitutionalPreviewBoot, InstitutionalPreviewIsolationError } =
    await import("@/lib/product/institutionalPreviewRuntime");

  try {
    if (shouldAssertDemoRuntimeAtBoot()) {
      assertDemoRuntimeBoot();
    } else {
      assertInstitutionalPreviewBoot();
      if (
        process.env.VERCEL_ENV === "preview"
        && process.env.ABRAXAS_RUNTIME_ENV?.trim() === "demo"
      ) {
        console.warn("demo_runtime.boot_skipped", {
          reason: "demo_runtime_env_without_demo_origin",
          hint: "Use ABRAXAS_RUNTIME_ENV=preview for institutional staging previews, or bind NEXT_PUBLIC_APP_URL to the DEMO origin.",
        });
      }
    }
  } catch (error) {
    if (error instanceof DemoRuntimeUnavailableError) {
      console.error("demo_runtime.boot_failed", { fail_codes: error.fail_codes });
    }
    if (error instanceof InstitutionalPreviewIsolationError) {
      console.error("institutional_preview.boot_failed", { fail_codes: error.fail_codes });
    }
    throw error;
  }
}
