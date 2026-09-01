// FILE: examples/good-trouble-wix/pages/ageVerificationPopup.test.js

import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ABRAXAS_LABEL_CONTINUE,
  ABRAXAS_LABEL_INITIAL,
  ABRAXAS_LABEL_RETRY,
  ABRAXAS_LABEL_STARTING,
  POPUP_STATE,
  STATUS_CAPTCHA_VERIFIED,
  STATUS_CONTACTING_BACKEND,
  STATUS_PREVIEW_PASSED,
  STATUS_WAITING_CAPTCHA,
  TRADITIONAL_AGE_GATE_STORAGE_KEY,
  TRADITIONAL_AGE_GATE_TTL_MS,
  buildTraditionalAgeAttestationValue,
  createPopupController,
  createPopupInitializationGuard,
  isEditorPreviewViewMode,
  persistTraditionalAgeAttestation,
} from "./ageVerificationPopupLogic.js";

const POPUP_SOURCE = readFileSync(
  new URL("./AgeVerificationPopup.js", import.meta.url),
  "utf8",
);
const LOGIC_SOURCE = readFileSync(
  new URL("./ageVerificationPopupLogic.js", import.meta.url),
  "utf8",
);

const REQUIRED_POPUP_ELEMENT_IDS = [
  "#yesButton",
  "#noButton",
  "#abraxasButton",
  "#abraxasCaptcha",
  "#abraxasStatusText",
];

describe("Wix deployment contract", () => {
  it("deploys logic to src/public/ageVerificationPopupLogic.js", () => {
    expect(LOGIC_SOURCE).toContain("src/public/ageVerificationPopupLogic.js");
  });

  it("imports logic via Wix Public-module path public/ageVerificationPopupLogic", () => {
    expect(POPUP_SOURCE).toContain('from "public/ageVerificationPopupLogic"');
    expect(POPUP_SOURCE).not.toContain('from "./ageVerificationPopupLogic"');
  });

  it("uses captcha.token and wixLocationFrontend.to for deployed navigation", () => {
    expect(POPUP_SOURCE).toContain("captcha.token");
    expect(POPUP_SOURCE).not.toContain("getToken()");
    expect(POPUP_SOURCE).toContain("wix-location-frontend");
    expect(POPUP_SOURCE).toContain("wixLocationFrontend.to(url)");
    expect(POPUP_SOURCE).not.toContain("window.location.href");
    expect(POPUP_SOURCE).not.toContain("age-verification-result");
  });

  it("awaits Wix enable/disable without enable-then-disable", () => {
    expect(POPUP_SOURCE).toContain("async function setButtonEnabled(selector, enabled)");
    expect(POPUP_SOURCE).toContain("await element.enable()");
    expect(POPUP_SOURCE).toContain("await element.disable()");
    expect(POPUP_SOURCE).not.toMatch(/element\.enable\(\);\s*\n\s*if \(!enabled\) element\.disable\(\)/);
  });

  it("requires exact popup element IDs", () => {
    for (const id of REQUIRED_POPUP_ELEMENT_IDS) {
      expect(POPUP_SOURCE).toContain(id);
    }
  });

  it("initializes only in browser render environment with a single handler set", () => {
    expect(POPUP_SOURCE).toContain('wixWindow.rendering.env === "browser"');
    expect(POPUP_SOURCE).toContain("createPopupInitializationGuard");
    expect(POPUP_SOURCE).toContain("initializeOnce");
  });
});

function createMemoryStorage() {
  /** @type {Record<string, string>} */
  const data = {};
  return {
    setItem(key, value) {
      data[key] = value;
    },
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
  };
}

function createDeps(overrides = {}) {
  return {
    setAbraxasButtonEnabled: vi.fn(async () => {}),
    setAbraxasButtonLabel: vi.fn(),
    setStatus: vi.fn(),
    resetCaptcha: vi.fn(),
    startAbraxasVerification: vi.fn(async () => ({
      verifyUrl: "https://abraxasworld.xyz/partner/verify?x=1",
      flowId: "gtf_" + "a".repeat(64),
      verifier: "b".repeat(64),
    })),
    sessionStorageAvailable: () => true,
    storeVerifier: vi.fn(),
    navigateToVerifyUrl: vi.fn(),
    getViewMode: vi.fn(async () => "Site"),
    storage: createMemoryStorage(),
    onTraditionalYesComplete: vi.fn(),
    ...overrides,
  };
}

/**
 * @param {number} delayMs
 */
function createDelayedButtonDeps(delayMs) {
  /** @type {Array<{ enabled: boolean, completedAt: number }>} */
  const completedTransitions = [];
  let transitionCounter = 0;

  const setAbraxasButtonEnabled = vi.fn(async (enabled) => {
    const transitionId = ++transitionCounter;
    await new Promise((resolve) => {
      setTimeout(() => {
        completedTransitions.push({ enabled, completedAt: transitionId });
        resolve(undefined);
      }, delayMs);
    });
  });

  return { setAbraxasButtonEnabled, completedTransitions };
}

describe("createPopupInitializationGuard", () => {
  it("allows only one initialization", () => {
    const guard = createPopupInitializationGuard();
    const first = guard.initializeOnce(() => "wired");
    const second = guard.initializeOnce(() => "duplicate");
    expect(first).toEqual({ ok: true, value: "wired" });
    expect(second).toEqual({ ok: false, code: "already_initialized" });
  });
});

describe("isEditorPreviewViewMode", () => {
  it("treats Preview and Editor as editor preview only", () => {
    expect(isEditorPreviewViewMode("Preview")).toBe(true);
    expect(isEditorPreviewViewMode("Editor")).toBe(true);
    expect(isEditorPreviewViewMode("Site")).toBe(false);
  });
});

describe("ageVerificationPopupLogic state machine", () => {
  /** @type {ReturnType<typeof createDeps>} */
  let deps;
  /** @type {ReturnType<typeof createPopupController>} */
  let controller;

  beforeEach(async () => {
    deps = createDeps();
    controller = createPopupController(deps);
    await controller.onReady();
  });

  it("starts in waiting_for_captcha with Abraxas button disabled", () => {
    expect(controller.getState()).toBe(POPUP_STATE.WAITING_FOR_CAPTCHA);
    expect(deps.setAbraxasButtonEnabled).toHaveBeenCalledWith(false);
    expect(deps.setAbraxasButtonLabel).toHaveBeenCalledWith(ABRAXAS_LABEL_INITIAL);
    expect(deps.setStatus).toHaveBeenCalledWith(STATUS_WAITING_CAPTCHA);
  });

  it("does not call backend before CAPTCHA verification", async () => {
    const result = await controller.onAbraxasClick();
    expect(result.code).toBe("captcha_required");
    expect(deps.startAbraxasVerification).not.toHaveBeenCalled();
  });

  it("enables Abraxas after nonempty captcha.token", async () => {
    await controller.onCaptchaVerified("captcha-token-value");
    expect(controller.getState()).toBe(POPUP_STATE.CAPTCHA_VERIFIED);
    expect(deps.setAbraxasButtonEnabled).toHaveBeenLastCalledWith(true);
    expect(deps.setAbraxasButtonLabel).toHaveBeenCalledWith(ABRAXAS_LABEL_CONTINUE);
    expect(deps.setStatus).toHaveBeenCalledWith(STATUS_CAPTCHA_VERIFIED);
  });

  it("rejects empty captcha.token on verified", async () => {
    await controller.onCaptchaVerified("");
    expect(controller.getState()).toBe(POPUP_STATE.WAITING_FOR_CAPTCHA);
    expect(deps.setAbraxasButtonEnabled).toHaveBeenLastCalledWith(false);
  });

  it("disables Abraxas on timeout/error", async () => {
    await controller.onCaptchaVerified("captcha-token-value");
    await controller.onCaptchaInvalidated();
    expect(controller.getState()).toBe(POPUP_STATE.WAITING_FOR_CAPTCHA);
    expect(deps.setAbraxasButtonEnabled).toHaveBeenLastCalledWith(false);
  });

  it("allows traditional Yes without CAPTCHA and persists 30-day self-attestation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const now = Date.now();

    const result = await controller.onTraditionalYesClick();

    expect(result).toEqual({ ok: true, code: "traditional_self_attested" });
    expect(deps.onTraditionalYesComplete).toHaveBeenCalledOnce();
    expect(deps.storage.getItem(TRADITIONAL_AGE_GATE_STORAGE_KEY)).toBe(
      buildTraditionalAgeAttestationValue(now),
    );
    expect(deps.startAbraxasVerification).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("sets Starting label and backend status after disable completes and before backend resolves", async () => {
    let resolveStart;
    deps.startAbraxasVerification = vi.fn(() => new Promise((resolve) => {
      resolveStart = resolve;
    }));
    await controller.onCaptchaVerified("captcha-token-value");

    const pending = controller.onAbraxasClick();
    await vi.waitFor(() => {
      expect(deps.setAbraxasButtonEnabled).toHaveBeenLastCalledWith(false);
    });

    expect(deps.setAbraxasButtonLabel).toHaveBeenCalledWith(ABRAXAS_LABEL_STARTING);
    expect(deps.setStatus).toHaveBeenCalledWith(STATUS_CONTACTING_BACKEND);
    expect(controller.getState()).toBe(POPUP_STATE.STARTING_BACKEND);

    resolveStart?.({
      verifyUrl: "https://abraxasworld.xyz/partner/verify?x=1",
      flowId: "gtf_" + "a".repeat(64),
      verifier: "b".repeat(64),
    });
    await pending;
  });

  it("redirects on Site/Test Site view and stores verifier only in sessionStorage", async () => {
    await controller.onCaptchaVerified("captcha-token-value");
    const result = await controller.onAbraxasClick();

    expect(result).toEqual({ ok: true, code: "redirecting" });
    expect(controller.getState()).toBe(POPUP_STATE.REDIRECTING);
    expect(deps.startAbraxasVerification).toHaveBeenCalledWith("captcha-token-value");
    expect(deps.storeVerifier).toHaveBeenCalledOnce();
    expect(deps.navigateToVerifyUrl).toHaveBeenCalledOnce();
    expect(deps.storage.getItem(TRADITIONAL_AGE_GATE_STORAGE_KEY)).toBeNull();
  });

  it("returns preview_backend_passed without navigation in editor preview", async () => {
    deps.getViewMode = vi.fn(async () => "Preview");
    await controller.onCaptchaVerified("captcha-token-value");
    const result = await controller.onAbraxasClick();

    expect(result).toEqual({ ok: true, code: "preview_backend_passed" });
    expect(controller.getState()).toBe(POPUP_STATE.PREVIEW_BACKEND_PASSED);
    expect(deps.setStatus).toHaveBeenCalledWith(STATUS_PREVIEW_PASSED);
    expect(deps.navigateToVerifyUrl).not.toHaveBeenCalled();
    expect(deps.storeVerifier).not.toHaveBeenCalled();
  });

  it("prevents duplicate backend requests while one start is in flight", async () => {
    let resolveStart;
    deps.startAbraxasVerification = vi.fn(() => new Promise((resolve) => {
      resolveStart = resolve;
    }));
    await controller.onCaptchaVerified("captcha-token-value");

    const first = controller.onAbraxasClick();
    const second = await controller.onAbraxasClick();

    expect(second).toEqual({ ok: false, code: "already_starting" });
    await vi.waitFor(() => {
      expect(deps.startAbraxasVerification).toHaveBeenCalledTimes(1);
    });

    resolveStart?.({
      verifyUrl: "https://abraxasworld.xyz/partner/verify?x=1",
      flowId: "gtf_" + "a".repeat(64),
      verifier: "b".repeat(64),
    });
    await first;
  });

  it("enters recoverable_error with safe code-specific messaging and CAPTCHA reset", async () => {
    deps.startAbraxasVerification = vi.fn(async () => ({ error: "rate_limited" }));
    await controller.onCaptchaVerified("captcha-token-value");

    const result = await controller.onAbraxasClick();

    expect(result.code).toBe("rate_limited");
    expect(controller.getState()).toBe(POPUP_STATE.WAITING_FOR_CAPTCHA);
    expect(deps.resetCaptcha).toHaveBeenCalled();
    expect(deps.setAbraxasButtonLabel).toHaveBeenCalledWith(ABRAXAS_LABEL_RETRY);
    expect(deps.setStatus).toHaveBeenLastCalledWith(
      expect.stringContaining("busy"),
    );
  });
});

describe("async Abraxas button enable/disable ordering", () => {
  it("awaits enable before exposing captcha verified status", async () => {
    /** @type {string[]} */
    const operationOrder = [];
    const deps = createDeps({
      setAbraxasButtonEnabled: vi.fn(async (enabled) => {
        if (enabled) {
          await new Promise((resolve) => setTimeout(resolve, 40));
          operationOrder.push("enable_complete");
        } else {
          await new Promise((resolve) => setTimeout(resolve, 10));
          operationOrder.push("disable_complete");
        }
      }),
      setStatus: vi.fn((message) => {
        operationOrder.push(`status:${message}`);
      }),
    });
    const controller = createPopupController(deps);
    await controller.onReady();

    await controller.onCaptchaVerified("captcha-token-value");

    const enableIndex = operationOrder.indexOf("enable_complete");
    const statusIndex = operationOrder.findIndex(
      (entry) => entry === `status:${STATUS_CAPTCHA_VERIFIED}`,
    );
    expect(enableIndex).toBeGreaterThanOrEqual(0);
    expect(statusIndex).toBeGreaterThan(enableIndex);
  });

  it("awaits disable before exposing captcha unavailable status", async () => {
    /** @type {string[]} */
    const operationOrder = [];
    const deps = createDeps({
      setAbraxasButtonEnabled: vi.fn(async (enabled) => {
        if (enabled) {
          await new Promise((resolve) => setTimeout(resolve, 10));
          operationOrder.push("enable_complete");
        } else {
          await new Promise((resolve) => setTimeout(resolve, 40));
          operationOrder.push("disable_complete");
        }
      }),
      setStatus: vi.fn((message) => {
        operationOrder.push(`status:${message}`);
      }),
    });
    const controller = createPopupController(deps);
    await controller.onReady();
    await controller.onCaptchaVerified("captcha-token-value");

    await controller.onCaptchaInvalidated();

    const disableIndex = operationOrder.lastIndexOf("disable_complete");
    const statusIndex = operationOrder.findIndex(
      (entry) => entry.startsWith("status:") && entry.includes("unavailable"),
    );
    expect(disableIndex).toBeGreaterThanOrEqual(0);
    expect(statusIndex).toBeGreaterThan(disableIndex);
  });

  it("finishes with button disabled when verify then invalidate overlap delayed transitions", async () => {
    const delayed = createDelayedButtonDeps(30);
    const deps = createDeps({
      setAbraxasButtonEnabled: delayed.setAbraxasButtonEnabled,
    });
    const controller = createPopupController(deps);
    await controller.onReady();

    const verifyPromise = controller.onCaptchaVerified("captcha-token-value");
    const invalidatePromise = controller.onCaptchaInvalidated();
    await Promise.all([verifyPromise, invalidatePromise]);

    expect(delayed.completedTransitions.at(-1)).toEqual({
      enabled: false,
      completedAt: expect.any(Number),
    });
    expect(controller.getState()).toBe(POPUP_STATE.WAITING_FOR_CAPTCHA);
  });

  it("awaits disable before backend start when enable resolves slowly", async () => {
    const delayed = createDelayedButtonDeps(25);
    /** @type {string[]} */
    const operationOrder = [];
    const deps = createDeps({
      setAbraxasButtonEnabled: vi.fn(async (enabled) => {
        await delayed.setAbraxasButtonEnabled(enabled);
        operationOrder.push(enabled ? "enable_complete" : "disable_complete");
      }),
      startAbraxasVerification: vi.fn(async () => {
        operationOrder.push("backend_start");
        return {
          verifyUrl: "https://abraxasworld.xyz/partner/verify?x=1",
          flowId: "gtf_" + "a".repeat(64),
          verifier: "b".repeat(64),
        };
      }),
    });
    const controller = createPopupController(deps);
    await controller.onReady();
    await controller.onCaptchaVerified("captcha-token-value");

    await controller.onAbraxasClick();

    const disableIndex = operationOrder.indexOf("disable_complete");
    const backendIndex = operationOrder.indexOf("backend_start");
    expect(disableIndex).toBeGreaterThanOrEqual(0);
    expect(backendIndex).toBeGreaterThan(disableIndex);
  });

  it("serializes overlapping verify and invalidate so the final button state stays disabled", async () => {
    const delayed = createDelayedButtonDeps(30);
    const deps = createDeps({
      setAbraxasButtonEnabled: delayed.setAbraxasButtonEnabled,
    });
    const controller = createPopupController(deps);
    await controller.onReady();

    const verifyPromise = controller.onCaptchaVerified("captcha-token-value");
    const invalidatePromise = controller.onCaptchaInvalidated();
    await Promise.all([verifyPromise, invalidatePromise]);

    expect(delayed.completedTransitions.at(-1)).toEqual({
      enabled: false,
      completedAt: expect.any(Number),
    });
    expect(delayed.completedTransitions.filter((entry) => entry.enabled)).toHaveLength(1);
    expect(controller.getState()).toBe(POPUP_STATE.WAITING_FOR_CAPTCHA);
  });
});

describe("persistTraditionalAgeAttestation", () => {
  it("writes expiry timestamp 30 days ahead", () => {
    const storage = createMemoryStorage();
    const now = new Date("2026-06-01T12:00:00.000Z").getTime();
    persistTraditionalAgeAttestation(storage, now);
    expect(storage.getItem(TRADITIONAL_AGE_GATE_STORAGE_KEY)).toBe(
      String(now + TRADITIONAL_AGE_GATE_TTL_MS),
    );
  });
});
