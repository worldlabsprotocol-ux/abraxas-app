import { beforeAll, describe, expect, it, vi } from "vitest";

const sharpDefault = vi.hoisted(() => vi.fn(() => ({
  rotate: vi.fn().mockReturnThis(),
  metadata: vi.fn(),
  resize: vi.fn().mockReturnThis(),
  grayscale: vi.fn().mockReturnThis(),
  raw: vi.fn().mockReturnThis(),
  toBuffer: vi.fn(),
  jpeg: vi.fn().mockReturnThis(),
  webp: vi.fn().mockReturnThis(),
  avif: vi.fn().mockReturnThis(),
})));

vi.mock("sharp", () => ({ default: sharpDefault }));

import {
  CAPTURE_IMAGE_FORMAT_ERROR,
  detectCaptureImageFormat,
  validateCaptureImageBytes,
} from "./captureImageFormat";

const pngFixture = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let jpegFixtureBytes: Buffer;
let webpFixtureBytes: Buffer;
let avifFixtureBytes: Buffer;

beforeAll(async () => {
  const sharp = (await vi.importActual<typeof import("sharp")>("sharp")).default;
  jpegFixtureBytes = await sharp({
    create: { width: 2, height: 2, channels: 3, background: { r: 1, g: 2, b: 3 } },
  }).jpeg().toBuffer();
  webpFixtureBytes = await sharp({
    create: { width: 2, height: 2, channels: 3, background: { r: 1, g: 2, b: 3 } },
  }).webp().toBuffer();
  avifFixtureBytes = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "red" },
  }).avif().toBuffer();
});

function jpegFixture(): Buffer {
  return jpegFixtureBytes;
}

function webpFixture(): Buffer {
  return webpFixtureBytes;
}

function avifFixture(): Buffer {
  return avifFixtureBytes;
}

const svgFixture = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
);

function expectReject(declaredMime: string, buffer: Buffer, label = "ID") {
  const result = validateCaptureImageBytes({ declaredMime, buffer, label });
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.code).toBe(CAPTURE_IMAGE_FORMAT_ERROR);
  }
  return result;
}

function expectAccept(declaredMime: string, buffer: Buffer, label = "ID") {
  const result = validateCaptureImageBytes({ declaredMime, buffer, label });
  expect(result.ok).toBe(true);
  return result;
}

describe("captureImageFormat", () => {
  describe("detectCaptureImageFormat", () => {
    it("detects jpeg, png, and webp signatures", () => {
      expect(detectCaptureImageFormat(jpegFixture())).toBe("jpeg");
      expect(detectCaptureImageFormat(pngFixture)).toBe("png");
      expect(detectCaptureImageFormat(webpFixture())).toBe("webp");
    });

    it("does not classify arbitrary RIFF as webp", () => {
      const riffNotWebp = Buffer.alloc(12, 0);
      riffNotWebp.write("RIFF", 0);
      riffNotWebp.write("WAVE", 8);
      expect(detectCaptureImageFormat(riffNotWebp)).toBe("unsupported");
    });
  });

  describe("valid MIME + byte pairs", () => {
    it("accepts JPEG with image/jpeg and image/jpg", () => {
      const jpeg = jpegFixture();
      expectAccept("image/jpeg", jpeg);
      expectAccept("image/jpg", jpeg);
    });

    it("accepts PNG and WEBP with matching MIME", () => {
      expectAccept("image/png", pngFixture);
      expectAccept("image/webp", webpFixture());
    });
  });

  describe("spoofed unsupported bytes", () => {
    it("rejects SVG bytes regardless of declared MIME", () => {
      expectReject("image/jpeg", svgFixture);
      expectReject("image/png", svgFixture);
      expectReject("image/webp", svgFixture);
    });

    it("rejects AVIF bytes regardless of declared MIME", () => {
      const avif = avifFixture();
      expectReject("image/jpeg", avif);
      expectReject("image/png", avif);
      expectReject("image/webp", avif);
    });
  });

  describe("supported-format MIME mismatches", () => {
    it("rejects cross-format MIME declarations", () => {
      const jpeg = jpegFixture();
      const webp = webpFixture();
      expectReject("image/jpeg", pngFixture);
      expectReject("image/png", jpeg);
      expectReject("image/webp", jpeg);
      expectReject("image/jpeg", webp);
    });

    it("rejects valid JPEG bytes with unsupported MIME", () => {
      expectReject("image/gif", jpegFixture());
    });
  });

  describe("malformed input", () => {
    it("rejects empty, random, and truncated signatures", () => {
      expectReject("image/jpeg", Buffer.alloc(0));
      expectReject("image/png", Buffer.from("not-an-image"));
      expectReject("image/jpeg", Buffer.from([0xff, 0xd8]));
      expectReject("image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      expectReject("image/webp", Buffer.from("RIFFxxxxWAVE", "ascii"));
    });
  });

  describe("pre-decode guarantee", () => {
    it("does not invoke sharp when validation rejects spoofed bytes", () => {
      sharpDefault.mockClear();
      expectReject("image/jpeg", svgFixture);
      expectReject("image/jpeg", avifFixture());
      expect(sharpDefault).not.toHaveBeenCalled();
    });
  });
});
