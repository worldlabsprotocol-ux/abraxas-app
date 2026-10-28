// FILE: lib/nav/postAuthResume.test.ts

import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  capturePostAuthResumePath,
  consumePostAuthResumePath,
  isResumableDeveloperPath,
  POST_AUTH_RESUME_STORAGE_KEY,
} from "./postAuthResume";

function installSessionStorageMock(): void {
  const store = new Map<string, string>();
  const sessionStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
  vi.stubGlobal("sessionStorage", sessionStorageMock);
  vi.stubGlobal("window", { sessionStorage: sessionStorageMock });
}

describe("postAuthResume", () => {
  beforeEach(() => {
    installSessionStorageMock();
    sessionStorage.clear();
  });

  it("recognizes developer workspace paths", () => {
    expect(isResumableDeveloperPath("/developers/ephemeral-sandbox")).toBe(true);
    expect(isResumableDeveloperPath("/developers/integration-studio")).toBe(true);
    expect(isResumableDeveloperPath("/")).toBe(true);
    expect(isResumableDeveloperPath("/passport")).toBe(false);
  });

  it("stores and consumes resume paths once", () => {
    capturePostAuthResumePath("/developers/ephemeral-sandbox?x=1");
    expect(sessionStorage.getItem(POST_AUTH_RESUME_STORAGE_KEY)).toBeTruthy();
    expect(consumePostAuthResumePath()).toBe("/developers/ephemeral-sandbox?x=1");
    expect(consumePostAuthResumePath()).toBeNull();
  });

  it("ignores non-developer paths", () => {
    capturePostAuthResumePath("/passport");
    expect(consumePostAuthResumePath()).toBeNull();
  });
});
