/** Optional chain conformance is not bundled in the default SDK artifact. */
export function evaluateConformance(): { ok: false; reasons: string[] } {
  return { ok: false, reasons: ["chain_conformance_not_bundled"] };
}

export function evaluateVectorConformance(): { ok: false; reasons: string[] } {
  return { ok: false, reasons: ["chain_conformance_not_bundled"] };
}
