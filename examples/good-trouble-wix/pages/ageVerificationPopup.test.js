// FILE: examples/good-trouble-wix/pages/ageVerificationPopup.test.js

import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ABRAXAS_SUPPORT,
  CAPTCHA_STATE,
  POPUP_STATUS,
  TRADITIONAL_AGE_GATE_STORAGE_KEY,
  TRADITIONAL_AGE_GATE_TTL_MS,
  TRADITIONAL_SUPPORT,
  buildTraditionalAgeAttestationValue,
  createPopupController,
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

  it("requires exact popup element IDs", () => {
    for (const id of REQUIRED_POPUP_ELEMENT_IDS) {
      expect(POPUP_SOURCE).toContain(id);
    }
    expect(POPUP_SOURCE).toContain(
      "Required element IDs: #yesButton, #noButton, #abraxasButton, #abraxasCaptcha, #abraxasStatusText",
    );
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
    setAbraxasButtonEnabled: vi.fn(),
    setStatus: vi.fn(),
    getCaptchaToken: vi.fn(async () => "captcha-token"),
    resetCaptcha: vi.fn(),
    startAbraxasVerification: vi.fn(async () => ({
      verifyUrl: "https://abraxasworld.xyz/partner/verify?x=1",
      flowId: "gtf_" + "a".repeat(64),
      verifier: "b".repeat(64),
    })),
    sessionStorageAvailable: () => true,
    storeVerifier: vi.fn(),
    navigateToVerifyUrl: vi.fn(),
    storage: createMemoryStorage(),
    onTraditionalYesComplete: vi.fn(),
    ...overrides,
  };
}

describe("ageVerificationPopupLogic", () => {
  /** @type {ReturnType<typeof createDeps>} */
  let deps;
  /** @type {ReturnType<typeof createPopupController>} */
  let controller;

  beforeEach(() => {
    deps = createDeps();
    controller = createPopupController(deps);
    controller.onReady();
  });

  it("disables only the Abraxas button on initial load", () => {
    expect(controller.getCaptchaState()).toBe(CAPTCHA_STATE.PENDING);
    expect(controller.isAbraxasButtonEnabled()).toBe(false);
    expect(deps.setAbraxasButtonEnabled).toHaveBeenCalledWith(false);
    expect(deps.setStatus).toHaveBeenCalledWith(POPUP_STATUS.ABRAXAS_CAPTCHA_PENDING);
  });

  it("enables Abraxas button after CAPTCHA verification", () => {
    controller.onCaptchaVerified();
    expect(controller.getCaptchaState()).toBe(CAPTCHA_STATE.VERIFIED);
    expect(controller.isAbraxasButtonEnabled()).toBe(true);
    expect(deps.setAbraxasButtonEnabled).toHaveBeenLastCalledWith(true);
    expect(deps.setStatus).toHaveBeenLastCalledWith(ABRAXAS_SUPPORT);
  });

  it("re-disables Abraxas button on CAPTCHA timeout", () => {
    controller.onCaptchaVerified();
    controller.onCaptchaInvalidated();
    expect(controller.getCaptchaState()).toBe(CAPTCHA_STATE.INVALID);
    expect(controller.isAbraxasButtonEnabled()).toBe(false);
    expect(deps.setAbraxasButtonEnabled).toHaveBeenLastCalledWith(false);
    expect(deps.setStatus).toHaveBeenLastCalledWith(POPUP_STATUS.ABRAXAS_CAPTCHA_UNAVAILABLE);
  });

  it("re-disables Abraxas button on CAPTCHA error", () => {
    controller.onCaptchaVerified();
    controller.onCaptchaInvalidated();
    expect(controller.isAbraxasButtonEnabled()).toBe(false);
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
    expect(deps.setAbraxasButtonEnabled).toHaveBeenCalledWith(false);
    vi.useRealTimers();
  });

  it("blocks Abraxas start before CAPTCHA verification", async () => {
    const result = await controller.onAbraxasClick();
    expect(result).toEqual({ ok: false, code: "captcha_required" });
    expect(deps.startAbraxasVerification).not.toHaveBeenCalled();
    expect(deps.setStatus).toHaveBeenLastCalledWith(POPUP_STATUS.ABRAXAS_CAPTCHA_REQUIRED);
  });

  it("starts Abraxas only after CAPTCHA verification and sends token to backend", async () => {
    controller.onCaptchaVerified();
    const result = await controller.onAbraxasClick();
    expect(result).toEqual({ ok: true, code: "navigating" });
    expect(deps.getCaptchaToken).toHaveBeenCalledOnce();
    expect(deps.startAbraxasVerification).toHaveBeenCalledWith("captcha-token");
    expect(deps.storeVerifier).toHaveBeenCalledOnce();
    expect(deps.navigateToVerifyUrl).toHaveBeenCalledOnce();
  });

  it("blocks Abraxas when CAPTCHA token is missing at start", async () => {
    deps.getCaptchaToken = vi.fn(async () => "");
    controller = createPopupController(deps);
    controller.onReady();
    controller.onCaptchaVerified();

    const result = await controller.onAbraxasClick();
    expect(result.code).toBe("captcha_token_missing");
    expect(deps.resetCaptcha).toHaveBeenCalledOnce();
    expect(controller.isAbraxasButtonEnabled()).toBe(false);
  });

  it("prevents duplicate Abraxas-start requests", async () => {
    let resolveStart;
    deps.startAbraxasVerification = vi.fn(() => new Promise((resolve) => {
      resolveStart = resolve;
    }));
    controller = createPopupController(deps);
    controller.onReady();
    controller.onCaptchaVerified();

    const first = controller.onAbraxasClick();
    const second = await controller.onAbraxasClick();

    expect(second).toEqual({ ok: false, code: "already_starting" });
    expect(deps.startAbraxasVerification).toHaveBeenCalledTimes(1);

    resolveStart?.({
      verifyUrl: "https://abraxasworld.xyz/partner/verify?x=1",
      flowId: "gtf_" + "a".repeat(64),
      verifier: "b".repeat(64),
    });
    await first;
  });

  it("distinguishes traditional self-attestation from stronger Abraxas verification in copy", () => {
    expect(TRADITIONAL_SUPPORT.toLowerCase()).toContain("self-attestation");
    expect(ABRAXAS_SUPPORT.toLowerCase()).toContain("policy-backed");
    expect(TRADITIONAL_SUPPORT).not.toContain("Abraxas");
  });

  it("never describes CAPTCHA as age or identity verification in status copy", () => {
    const forbidden = /\b(age verification|identity verification|eligibility verification)\b/i;
    for (const message of Object.values(POPUP_STATUS)) {
      expect(message).not.toMatch(forbidden);
    }
    expect(ABRAXAS_SUPPORT).not.toMatch(forbidden);
    expect(TRADITIONAL_SUPPORT).not.toMatch(forbidden);
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
