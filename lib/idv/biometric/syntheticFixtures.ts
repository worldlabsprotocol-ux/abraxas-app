// FILE: lib/idv/biometric/syntheticFixtures.ts
// Synthetic capture buffers for verification matrix tests (not production).

import sharp from "sharp";

export async function solidJpeg(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r, g, b } },
  }).jpeg().toBuffer();
}

export async function noisyPassportLikeId(): Promise<Buffer> {
  const w = 1200;
  const h = 850;
  const base = await sharp({
    create: { width: w, height: h, channels: 3, background: { r: 235, g: 232, b: 225 } },
  })
    .png()
    .toBuffer();

  const faceSvg = Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e8e4dc"/>
      <rect x="40" y="60" width="520" height="340" fill="#1e3a5f" opacity="0.85"/>
      <ellipse cx="300" cy="230" rx="95" ry="120" fill="#c89575"/>
      <rect x="600" y="80" width="520" height="40" fill="#333"/>
      <rect x="600" y="140" width="420" height="18" fill="#666"/>
      <rect x="600" y="175" width="380" height="18" fill="#666"/>
      <rect x="600" y="210" width="400" height="18" fill="#666"/>
    </svg>
  `);

  return sharp(base)
    .composite([{ input: faceSvg, top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toBuffer();
}

export async function matchingSelfie(): Promise<Buffer> {
  const w = 720;
  const h = 960;
  const svg = Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#b8c4ce"/>
      <ellipse cx="360" cy="420" rx="140" ry="175" fill="#c89575"/>
      <ellipse cx="300" cy="380" rx="22" ry="16" fill="#2d1f14"/>
      <ellipse cx="420" cy="380" rx="22" ry="16" fill="#2d1f14"/>
    </svg>
  `);
  return sharp(svg).jpeg({ quality: 90 }).toBuffer();
}

export async function wallSelfie(): Promise<Buffer> {
  return solidJpeg(720, 960, 178, 175, 168);
}

export async function blankWhiteId(): Promise<Buffer> {
  return solidJpeg(1200, 850, 255, 255, 255);
}

export async function portraitRandomPhoto(): Promise<Buffer> {
  return solidJpeg(900, 1600, 90, 120, 80);
}

export async function twoFaceSelfie(): Promise<Buffer> {
  const w = 720;
  const h = 960;
  const svg = Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#c8d0d8"/>
      <ellipse cx="150" cy="420" rx="100" ry="130" fill="#d4a574"/>
      <ellipse cx="570" cy="420" rx="100" ry="130" fill="#b8845f"/>
    </svg>
  `);
  return sharp(svg).jpeg({ quality: 90 }).toBuffer();
}

export async function blurryPassportId(): Promise<Buffer> {
  const sharp_id = await noisyPassportLikeId();
  return sharp(sharp_id).blur(8).jpeg({ quality: 70 }).toBuffer();
}

export async function driversLicenseAspectId(): Promise<Buffer> {
  const w = 1050;
  const h = 660;
  const svg = Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e2e8f0"/>
      <ellipse cx="200" cy="330" rx="80" ry="100" fill="#c89575"/>
      <rect x="360" y="120" width="600" height="24" fill="#334155"/>
      <rect x="360" y="170" width="500" height="18" fill="#64748b"/>
    </svg>
  `);
  return sharp(svg).jpeg({ quality: 90 }).toBuffer();
}
