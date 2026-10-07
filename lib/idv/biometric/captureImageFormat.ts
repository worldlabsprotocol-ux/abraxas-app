// FILE: lib/idv/biometric/captureImageFormat.ts
// Fail-closed byte-format validation for document capture uploads.

export type CaptureImageFormat = "jpeg" | "png" | "webp" | "unsupported";

export const CAPTURE_IMAGE_MIME_ALLOWLIST = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const CAPTURE_IMAGE_FORMAT_ERROR = "unsupported_image_format";

const MIME_TO_FORMAT: Record<string, CaptureImageFormat> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Deterministic magic-byte detection for supported capture formats only. */
export function detectCaptureImageFormat(buffer: Buffer): CaptureImageFormat {
  if (buffer.length === 0) return "unsupported";

  if (
    buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
    && buffer[4] === 0x0d
    && buffer[5] === 0x0a
    && buffer[6] === 0x1a
    && buffer[7] === 0x0a
  ) {
    return "png";
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  if (
    buffer.length >= 12
    && buffer[0] === 0x52
    && buffer[1] === 0x49
    && buffer[2] === 0x46
    && buffer[3] === 0x46
    && buffer[8] === 0x57
    && buffer[9] === 0x45
    && buffer[10] === 0x42
    && buffer[11] === 0x50
  ) {
    return "webp";
  }

  return "unsupported";
}

export type CaptureImageBytesValidationResult =
  | { ok: true; format: CaptureImageFormat }
  | { ok: false; code: typeof CAPTURE_IMAGE_FORMAT_ERROR; message: string };

export function validateCaptureImageBytes(input: {
  declaredMime: string;
  buffer: Buffer;
  label: string;
}): CaptureImageBytesValidationResult {
  const declaredMime = input.declaredMime.toLowerCase().trim();

  if (!CAPTURE_IMAGE_MIME_ALLOWLIST.has(declaredMime)) {
    return {
      ok: false,
      code: CAPTURE_IMAGE_FORMAT_ERROR,
      message: `Invalid file type for ${input.label}. Use JPG, PNG, or WEBP.`,
    };
  }

  const expectedFormat = MIME_TO_FORMAT[declaredMime];
  const actualFormat = detectCaptureImageFormat(input.buffer);

  if (actualFormat === "unsupported" || actualFormat !== expectedFormat) {
    return {
      ok: false,
      code: CAPTURE_IMAGE_FORMAT_ERROR,
      message: `Invalid image for ${input.label}. Upload a JPG, PNG, or WEBP file that matches its format.`,
    };
  }

  return { ok: true, format: actualFormat };
}
