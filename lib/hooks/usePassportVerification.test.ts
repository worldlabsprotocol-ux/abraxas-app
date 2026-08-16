// @vitest-environment jsdom
// FILE: lib/hooks/usePassportVerification.test.ts

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePassportVerification } from "./usePassportVerification";
import * as passportApi from "@/lib/api/passport";

function createWrapper(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePassportVerification status fetch errors", () => {
  it("exports load_failed when the initial fetch fails", async () => {
    vi.spyOn(passportApi, "fetchIdentityStatus").mockRejectedValue(new Error("db_timeout_secret"));

    const { result } = renderHook(
      () => usePassportVerification("0xabc", "holder@example.com"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isStatusFetchError).toBe(true);
    });

    expect(result.current.statusFetchError).toBe("load_failed");
    expect(result.current.hasStatusSnapshot).toBe(false);
    expect(result.current.statusFetchError).not.toBe("db_timeout_secret");
  });

  it("exports refresh_failed when a refetch fails with cached data", async () => {
    vi.spyOn(passportApi, "fetchIdentityStatus")
      .mockResolvedValueOnce({
        status: "not_started",
        veriff_configured: false,
        idv_provider: "manual",
        wallet_binding_l3: false,
      })
      .mockRejectedValueOnce(new Error("refresh_secret"));

    vi.spyOn(passportApi, "fetchOnChainPassportStatus").mockResolvedValue({
      provisioned: false,
      object_id: null,
      stamp_bitmask: 0,
      stamp_ids: [],
      stamps_complete: false,
      issuer_configured: false,
      explorer_object: null,
      create_tx_digest: null,
      stamps_tx_digest: null,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(
      () => usePassportVerification("0xabc", "holder@example.com"),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => {
      expect(result.current.hasStatusSnapshot).toBe(true);
    });

    await result.current.refresh();

    await waitFor(() => {
      expect(result.current.statusFetchError).toBe("refresh_failed");
    });

    expect(result.current.hasStatusSnapshot).toBe(true);
    expect(result.current.statusFetchError).not.toBe("refresh_secret");
  });

  it("clears status fetch error after a successful fetch", async () => {
    vi.spyOn(passportApi, "fetchIdentityStatus").mockResolvedValue({
      status: "not_started",
      veriff_configured: false,
      idv_provider: "manual",
      wallet_binding_l3: false,
    });

    const { result } = renderHook(
      () => usePassportVerification("0xabc", "holder@example.com"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isStatusFetchError).toBe(false);
    });

    expect(result.current.statusFetchError).toBeNull();
  });
});
