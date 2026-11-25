// A bounded first-deployment growth margin. Future extensions require a new
// rent quote and separate authorized upgrade; this is not an auto-upgrade.
export function programAllocationBytes(elfLength) {
  if (!Number.isSafeInteger(elfLength) || elfLength < 100_000 || elfLength > 5_000_000) {
    throw new Error("Unexpected ELF length");
  }
  const margin = Math.max(32_768, Math.ceil(elfLength * 0.15));
  return Math.ceil((elfLength + margin) / 4096) * 4096;
}

