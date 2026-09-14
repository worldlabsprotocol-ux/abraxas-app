// @vitest-environment jsdom
// FILE: lib/passport/passportWalletRepairReload.integration.test.ts
// Production regression: repair → identity refresh → reload still secured.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePassportVerification } from "@/lib/hooks/usePassportVerification";
import * as passportApi from "@/lib/api/passport";
import { computePassportSetupState } from "@/lib/idv/identityVerificationStates";

const SUI = "0x" + "1".repeat(64);

function wrapper(client: QueryClient) {
  return function Provider({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("passport wallet repair reload integration", () => {
  it("keeps walletBound true after repair refresh simulating full reload", async () => {
    const boundSetup = computePassportSetupState({
      walletDone: true,
      identityStatus: "not_started",
      credentialStatus: "not_issued",
      walletBindingL3: true,
    });

    const fetchIdentityStatus = vi.spyOn(passportApi, "fetchIdentityStatus")
      .mockResolvedValueOnce({
        status: "not_started",
        idv_provider: "manual",
        veriff_configured: false,
        wallet_binding_l3: false,
        wallet_binding_status: "missing",
        setup: computePassportSetupState({
          walletDone: true,
          identityStatus: "not_started",
          credentialStatus: "not_issued",
          walletBindingL3: false,
        }),
      })
      .mockResolvedValue({
        status: "not_started",
        idv_provider: "manual",
        veriff_configured: false,
        wallet_binding_l3: true,
        wallet_binding_status: "active",
        setup: boundSetup,
      });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => usePassportVerification(SUI, "holder@example.com"),
      { wrapper: wrapper(client) },
    );

    await waitFor(() => {
      expect(result.current.setup?.walletBound).toBe(false);
    });

    await result.current.refreshWalletBindingState();

    await waitFor(() => {
      expect(result.current.setup?.walletBound).toBe(true);
      expect(result.current.walletBindingStatus).toBe("active");
    });

    await result.current.refresh();

    await waitFor(() => {
      expect(result.current.setup?.walletBound).toBe(true);
      expect(fetchIdentityStatus.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });
});
