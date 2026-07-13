// FILE: lib/auth/postLoginReturn.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  consumePostLoginReturn,
  peekPostLoginReturn,
  sanitizeReturnPath,
  savePostLoginReturn,
} from "@/lib/auth/postLoginReturn";

function mockSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
  vi.stubGlobal("window", { sessionStorage });
  vi.stubGlobal("sessionStorage", sessionStorage);
  return store;
}

describe("postLoginReturn", () => {
  beforeEach(() => {
    mockSessionStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts same-origin relative paths", () => {
    expect(sanitizeReturnPath("/connect/authorize?request=car_123")).toBe(
      "/connect/authorize?request=car_123",
    );
    expect(sanitizeReturnPath(encodeURIComponent("/passport?return=%2Fdemo"))).toBe(
      "/passport?return=%2Fdemo",
    );
  });

  it("rejects open redirects and absolute URLs", () => {
    expect(sanitizeReturnPath("//evil.example/phish")).toBeNull();
    expect(sanitizeReturnPath("https://evil.example/phish")).toBeNull();
    expect(sanitizeReturnPath("")).toBeNull();
  });

  it("persists and consumes return path in sessionStorage", () => {
    savePostLoginReturn("/connect/authorize?request=car_abc");
    expect(peekPostLoginReturn()).toBe("/connect/authorize?request=car_abc");
    expect(consumePostLoginReturn()).toBe("/connect/authorize?request=car_abc");
    expect(peekPostLoginReturn()).toBeNull();
  });
});
