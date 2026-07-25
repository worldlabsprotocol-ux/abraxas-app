// FILE: lib/mediaProbe.ts
// Client-side image availability checks for registry slideshows.

export function probeImage(src: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

export async function probeImageList(paths: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const src of paths) {
    if (await probeImage(src)) found.push(src);
  }
  return found;
}
