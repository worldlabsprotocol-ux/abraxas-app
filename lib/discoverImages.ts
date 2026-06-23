// FILE: lib/discoverImages.ts
// Shared, cached image-discovery utility. Several components were
// independently re-implementing "try a wide list of candidate
// filenames, see which ones actually load" with their own copy of
// the same logic, and none of them cached the result, so every page
// load re-checked dozens of URLs over the network for no reason.
// This does it once per session and remembers the answer.

const memoryCache = new Map<string, string[]>();

function checkImage(src: string): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Probes a list of candidate URLs and returns the ones that actually
 * load, in order. Caches the result in memory and sessionStorage under
 * cacheKey, so repeat calls within the same browser session are free.
 */
export async function discoverImages(cacheKey: string, candidates: string[]): Promise<string[]> {
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey)!;

  if (typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem(`img-discovery:${cacheKey}`);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        memoryCache.set(cacheKey, parsed);
        return parsed;
      }
    } catch { /* sessionStorage unavailable, fall through to a live probe */ }
  }

  const results = await Promise.all(candidates.map(checkImage));
  const found = results.filter((r): r is string => r !== null);

  memoryCache.set(cacheKey, found);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(`img-discovery:${cacheKey}`, JSON.stringify(found));
    } catch { /* storage full or disabled, memory cache still helps this session */ }
  }

  return found;
}

/** Generates the "n written twice" filename pattern: 2 -> "22", 16 -> "1616". */
export function selfConcatFilenames(basePath: string, maxN: number, ext = "jpg"): string[] {
  return Array.from({ length: maxN }, (_, i) => {
    const n = i + 1;
    return `${basePath}/${n}${n}.${ext}`;
  });
}

/** Generates month-year filenames like "dec23", "jan24" across a year range. */
export function monthYearFilenames(basePath: string, startYear: number, endYear: number, exts = ["jpg", "webp", "png"]): string[] {
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const out: string[] = [];
  for (let year = startYear; year <= endYear; year++) {
    for (const m of months) {
      for (const ext of exts) {
        out.push(`${basePath}/${m}${year}.${ext}`);
      }
    }
  }
  return out;
}
