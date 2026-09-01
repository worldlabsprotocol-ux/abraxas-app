// FILE: examples/good-trouble-wix/pages/ageVerificationPopup.test.js

import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ABRAXAS_LABEL,
  ABRAXAS_LABEL_STARTING,
  POPUP_STATE,
  STATUS_GENERIC_FAILURE,
  STATUS_PREVIEW_PASSED,
  STATUS_READY,
  STATUS_STARTING,
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
const WEB_SOURCE = readFileSync(
  new URL("../backend/abraxasVerification.web.js", import.meta.url),
  "utf8",
);

const REQUIRED_POPUP_ELEMENT_IDS = [
  "#yesButton",
  "#noButton",
  "#abraxasButton",
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

  it("does not require captcha element or token at runtime", () => {
    expect(POPUP_SOURCE).not.toMatch(/\$w\("#abraxasCaptcha"\)/);
    expect(POPUP_SOURCE).not.toContain("captcha.token");
    expect(POPUP_SOURCE).not.toContain("wireCaptchaElement");
    expect(POPUP_SOURCE).not.toContain("resetCaptcha");
  });

  it("starts Abraxas with no client arguments and wixLocationFrontend.to navigation", () => {
    expect(POPUP_SOURCE).toContain("createAbraxasVerificationStart()");
    expect(POPUP_SOURCE).not.toMatch(/createAbraxasVerificationStart\([^)]+\)/);
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

  it("requires exact popup element IDs (no captcha)", () => {
    for (const id of REQUIRED_POPUP_ELEMENT_IDS) {
      expect(POPUP_SOURCE).toContain(id);
    }
    expect(POPUP_SOURCE).not.toMatch(/Required element IDs:[^\n]*#abraxasCaptcha/);
  });

  it("initializes only in browser render environment with a single handler set", () => {
    expect(POPUP_SOURCE).toContain('wixWindow.rendering.env === "browser"');
    expect(POPUP_SOURCE).toContain("createPopupInitializationGuard");
    expect(POPUP_SOURCE).toContain("initializeOnce");
  });
});

describe("abraxasVerification.web.js server-owned bypass", () => {
  it("accepts no client parameters and sets skipCaptcha server-side only", () => {
    expect(WEB_SOURCE).not.toContain("wix-captcha-backend");
    expect(WEB_SOURCE).toMatch(/async \(\) =>\s*\n?\s*createAbraxasVerificationStartService\(null,/);
    expect(WEB_SOURCE).toContain("skipCaptcha: true");
    expect(WEB_SOURCE).not.toMatch(/skipCaptcha:\s*(captchaToken|true\s*,\s*deps)/);
  });

  it("preserves Permissions.Anyone and completeAbraxasVerification", () => {
    expect(WEB_SOURCE).toContain("Permissions.Anyone");
    expect(WEB_SOURCE).toContain("completeAbraxasVerification");
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

  it("starts ready with Abraxas button enabled and privacy-preserving copy", () => {
    expect(controller.getState()).toBe(POPUP_STATE.READY);
    expect(deps.setAbraxasButtonEnabled).toHaveBeenLastCalledWith(true);
    expect(deps.setAbraxasButtonLabel).toHaveBeenCalledWith(ABRAXAS_LABEL);
    expect(deps.setStatus).toHaveBeenCalledWith(STATUS_READY);
  });

  it("invokes backend exactly once with no client arguments on click", async () => {
    const result = await controller.onAbraxasClick();

    expect(result).toEqual({ ok: true, code: "redirecting" });
    expect(deps.startAbraxasVerification).toHaveBeenCalledOnce();
    expect(deps.startAbraxasVerification).toHaveBeenCalledWith();
  });

  it("disables button and shows starting status before backend resolves", async () => {
    let resolveStart;
    deps.startAbraxasVerification = vi.fn(() => new Promise((resolve) => {
      resolveStart = resolve;
    }));

    const pending = controller.onAbraxasClick();
    await vi.waitFor(() => {
      expect(deps.setAbraxasButtonEnabled).toHaveBeenLastCalledWith(false);
    });

    expect(deps.setAbraxasButtonLabel).toHaveBeenCalledWith(ABRAXAS_LABEL_STARTING);
    expect(deps.setStatus).toHaveBeenCalledWith(STATUS_STARTING);
    expect(controller.getState()).toBe(POPUP_STATE.STARTING_BACKEND);

    resolveStart?.({
      verifyUrl: "https://abraxasworld.xyz/partner/verify?x=1",
      flowId: "gtf_" + "a".repeat(64),
      verifier: "b".repeat(64),
    });
    await pending;
  });

  it("redirects on Site/Test Site view and stores verifier only in sessionStorage", async () => {
    const result = await controller.onAbraxasClick();

    expect(result).toEqual({ ok: true, code: "redirecting" });
    expect(controller.getState()).toBe(POPUP_STATE.REDIRECTING);
    expect(deps.storeVerifier).toHaveBeenCalledOnce();
    expect(deps.navigateToVerifyUrl).toHaveBeenCalledOnce();
    expect(deps.storage.getItem(TRADITIONAL_AGE_GATE_STORAGE_KEY)).toBeNull();
  });

  it("returns preview_backend_passed without navigation in editor preview", async () => {
    deps.getViewMode = vi.fn(async () => "Preview");
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

  it("re-enables the button after recoverable failure with a safe message", async () => {
    deps.startAbraxasVerification = vi.fn(async () => ({ error: "rate_limited" }));

    const result = await controller.onAbraxasClick();

    expect(result.code).toBe("rate_limited");
    expect(controller.getState()).toBe(POPUP_STATE.READY);
    expect(deps.setAbraxasButtonEnabled).toHaveBeenLastCalledWith(true);
    expect(deps.setAbraxasButtonLabel).toHaveBeenLastCalledWith(ABRAXAS_LABEL);
    expect(deps.setStatus).toHaveBeenLastCalledWith(
      expect.stringContaining("busy"),
    );
  });

  it("re-enables the button with generic failure for non-allowlisted errors", async () => {
    deps.startAbraxasVerification = vi.fn(async () => ({ error: "internal_secret_detail" }));

    const result = await controller.onAbraxasClick();

    expect(result.code).toBe("start_failed");
    expect(controller.getState()).toBe(POPUP_STATE.READY);
    expect(deps.setAbraxasButtonEnabled).toHaveBeenLastCalledWith(true);
    expect(deps.setStatus).toHaveBeenLastCalledWith(STATUS_GENERIC_FAILURE);
  });

  it("allows traditional Yes without Abraxas and persists 30-day self-attestation", async () => {
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
});

describe("async Abraxas button enable/disable ordering", () => {
  it("awaits disable before backend start when transitions are delayed", async () => {
    /** @type {string[]} */
    const operationOrder = [];
    const deps = createDeps({
      setAbraxasButtonEnabled: vi.fn(async (enabled) => {
        await new Promise((resolve) => setTimeout(resolve, enabled ? 10 : 30));
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

    await controller.onAbraxasClick();

    const disableIndex = operationOrder.indexOf("disable_complete");
    const backendIndex = operationOrder.indexOf("backend_start");
    expect(disableIndex).toBeGreaterThanOrEqual(0);
    expect(backendIndex).toBeGreaterThan(disableIndex);
  });

  it("awaits re-enable before exposing recoverable failure status", async () => {
    /** @type {string[]} */
    const operationOrder = [];
    const deps = createDeps({
      setAbraxasButtonEnabled: vi.fn(async (enabled) => {
        await new Promise((resolve) => setTimeout(resolve, enabled ? 40 : 10));
        operationOrder.push(enabled ? "enable_complete" : "disable_complete");
      }),
      setStatus: vi.fn((message) => {
        operationOrder.push(`status:${message}`);
      }),
      startAbraxasVerification: vi.fn(async () => ({ error: "rate_limited" })),
    });
    const controller = createPopupController(deps);
    await controller.onReady();

    await controller.onAbraxasClick();

    const enableIndex = operationOrder.lastIndexOf("enable_complete");
    const statusIndex = operationOrder.findIndex(
      (entry) => entry.startsWith("status:") && entry.includes("busy"),
    );
    expect(enableIndex).toBeGreaterThanOrEqual(0);
    expect(statusIndex).toBeGreaterThan(enableIndex);
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
