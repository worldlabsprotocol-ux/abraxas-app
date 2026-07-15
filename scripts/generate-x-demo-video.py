#!/usr/bin/env python3
# FILE: scripts/generate-x-demo-video.py
# Generates a 60s vertical X demo video + thumbnail for Abraxas protocol launch.

from __future__ import annotations

import math
import os
import shutil
import subprocess
import textwrap
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "artifacts" / "marketing"
FRAMES_DIR = OUT_DIR / "frames"
PUBLIC_ICON = ROOT / "public" / "icon-48.png"

W, H = 1080, 1920
FPS = 24
DURATION_S = 54

# Institutional palette (matches boot screen)
BG_TOP = (4, 5, 10)
BG_MID = (10, 8, 20)
GOLD = (232, 197, 71)
GOLD_PALE = (245, 230, 168)
VIOLET = (196, 181, 253)
WHITE = (250, 250, 250)
SECONDARY = (212, 212, 216)
CAPTION = (161, 161, 170)
DARK_BTN = (10, 8, 20)

FONT_INTER_BOLD = "/usr/share/fonts/truetype/macos/Inter-Bold.ttf"
FONT_INTER = "/usr/share/fonts/truetype/macos/Inter-Regular.ttf"
FONT_INTER_SEMI = "/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Bold.ttf"


@dataclass
class Scene:
    start: float
    end: float
    draw: callable


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * max(0.0, min(1.0, t))


def ease_out(t: float) -> float:
    return 1 - (1 - t) ** 3


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def make_bg() -> Image.Image:
    img = Image.new("RGB", (W, H), BG_TOP)
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        r = int(lerp(BG_TOP[0], BG_MID[0], t))
        g = int(lerp(BG_TOP[1], BG_MID[1], t))
        b = int(lerp(BG_TOP[2], BG_MID[2], t))
        draw.line([(0, y), (W, y)], fill=(r, g, b))
    # Gold glow center-top
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W * 0.1, -H * 0.05, W * 0.9, H * 0.45], fill=(232, 197, 71, 38))
    gd.ellipse([W * 0.55, H * 0.55, W * 1.1, H * 0.95], fill=(196, 181, 253, 28))
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    img.paste(glow, (0, 0), glow)
    return img


def draw_eyebrow(draw: ImageDraw.ImageDraw, text: str, y: int, alpha: float = 1.0) -> None:
    font = load_font(FONT_MONO, 28)
    color = (*VIOLET, int(255 * alpha)) if hasattr(draw, "mode") else VIOLET
    draw.text((W // 2, y), text.upper(), font=font, fill=VIOLET, anchor="mm")


def draw_headline(draw: ImageDraw.ImageDraw, lines: list[tuple[str, tuple]], y: int, alpha: float = 1.0) -> None:
    font = load_font(FONT_INTER_BOLD, 72)
    line_h = 86
    cy = y
    for text, color in lines:
        c = tuple(int(lerp(BG_TOP[i], color[i], alpha)) for i in range(3)) if alpha < 1 else color
        draw.text((W // 2, cy), text, font=font, fill=c, anchor="mm")
        cy += line_h


def draw_body(draw: ImageDraw.ImageDraw, text: str, y: int, size: int = 38, alpha: float = 1.0) -> None:
    font = load_font(FONT_INTER, size)
    wrapped = textwrap.wrap(text, width=28)
    cy = y
    for line in wrapped:
        c = tuple(int(lerp(BG_TOP[i], SECONDARY[i], alpha)) for i in range(3))
        draw.text((W // 2, cy), line, font=font, fill=c, anchor="mm")
        cy += size + 14


def draw_doc_stack(draw: ImageDraw.ImageDraw, cx: int, cy: int, count: int, offset: int, label: str) -> None:
    for i in range(count):
        ox = (i - count // 2) * 8 + offset
        oy = i * 6
        x0, y0 = cx - 140 + ox, cy - 80 + oy
        x1, y1 = cx + 140 + ox, cy + 80 + oy
        draw.rounded_rectangle([x0, y0, x1, y1], radius=12, fill=(22, 22, 28), outline=GOLD, width=2)
    font = load_font(FONT_MONO, 22)
    draw.text((cx, cy + 110), label, font=font, fill=CAPTION, anchor="mm")


def draw_passport_card(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float = 1.0) -> None:
    w, h = int(420 * scale), int(260 * scale)
    x0, y0 = cx - w // 2, cy - h // 2
    x1, y1 = cx + w // 2, cy + h // 2
    draw.rounded_rectangle([x0, y0, x1, y1], radius=20, fill=(18, 18, 24), outline=GOLD, width=3)
    f = load_font(FONT_INTER_SEMI, int(34 * scale))
    draw.text((cx, cy - 40 * scale), "ABRAXAS PASSPORT", font=load_font(FONT_MONO, int(22 * scale)), fill=VIOLET, anchor="mm")
    draw.text((cx, cy + 10 * scale), "Verified once ✓", font=f, fill=GOLD_PALE, anchor="mm")
    draw.text((cx, cy + 55 * scale), "Reuse everywhere", font=load_font(FONT_INTER, int(28 * scale)), fill=SECONDARY, anchor="mm")


def composite_icon(base: Image.Image, cx: int, cy: int, size: int = 96) -> None:
    if not PUBLIC_ICON.exists():
        return
    icon = Image.open(PUBLIC_ICON).convert("RGBA")
    icon = icon.resize((size, size), Image.Resampling.LANCZOS)
    base.paste(icon, (cx - size // 2, cy - size // 2), icon)


def scene_progress(t: float, start: float, end: float) -> float:
    if t < start:
        return 0.0
    if t > end:
        return 1.0
    return (t - start) / (end - start)


def render_frame(t: float, bg: Image.Image) -> Image.Image:
    img = bg.copy()
    draw = ImageDraw.Draw(img)

    # ── Scene 1: Hook (0–8s) ─────────────────────────────────────
    p1 = ease_out(scene_progress(t, 0.0, 1.2))
    if t < 10:
        draw_eyebrow(draw, "New partner · Land", int(H * 0.14), p1)
        draw_headline(draw, [
            ("Another land partner", WHITE),
            ("onboarded.", GOLD_PALE),
        ], int(H * 0.22), p1)
        sub_a = ease_out(scene_progress(t, 1.0, 2.5))
        draw_body(draw, "Nearly $2M in attested assets on Abraxas.", int(H * 0.38), 40, sub_a)
        stat_a = ease_out(scene_progress(t, 2.0, 3.5))
        if stat_a > 0:
            font = load_font(FONT_INTER_BOLD, 56)
            draw.text((W // 2, int(H * 0.48)), "$2M+", font=font, fill=GOLD, anchor="mm")
            draw.text((W // 2, int(H * 0.52)), "Chickasaw Project · Cielo · live registry", font=load_font(FONT_INTER, 30), fill=SECONDARY, anchor="mm")

    # ── Scene 2: Pain (8–25s) ───────────────────────────────────
    if 7.5 <= t < 27:
        p2 = ease_out(scene_progress(t, 8.0, 9.5))
        draw_eyebrow(draw, "The hidden cost", int(H * 0.12), p2)
        draw_headline(draw, [
            ("Same deeds.", WHITE),
            ("Same surveys.", GOLD_PALE),
            ("Every counterparty.", VIOLET),
        ], int(H * 0.20), p2)

        cycle = int((t - 8) * 2) % 4
        labels = ["deed.pdf", "survey.pdf", "title.pdf", "KYC.zip"]
        for i, lab in enumerate(labels):
            active = i <= cycle
            ox = int(math.sin(t * 2 + i) * 12) if active else 0
            draw_doc_stack(draw, W // 2, int(H * 0.42) + i * 30, 3 if active else 1, ox, lab if active else "")

        pain_a = ease_out(scene_progress(t, 12.0, 14.0))
        draw_body(draw, "Sending the same ownership records to every new buyer, lender, and partner — over and over.", int(H * 0.62), 36, pain_a)

    # ── Scene 3: Analogy (25–35s) ───────────────────────────────
    if 24.5 <= t < 37:
        p3 = ease_out(scene_progress(t, 25.0, 26.5))
        draw_eyebrow(draw, "Sound familiar?", int(H * 0.14), p3)
        draw_headline(draw, [
            ("Crypto had this", WHITE),
            ("with repeated KYC.", GOLD_PALE),
        ], int(H * 0.24), p3)
        p3b = ease_out(scene_progress(t, 27.5, 29.0))
        draw_headline(draw, [
            ("Real-world assets", WHITE),
            ("had it forever.", VIOLET),
        ], int(H * 0.38), p3b)

    # ── Scene 4: Solution (35–50s) ──────────────────────────────
    if 34.5 <= t < 52:
        p4 = ease_out(scene_progress(t, 35.0, 36.5))
        composite_icon(img, W // 2, int(H * 0.13), 88)
        draw = ImageDraw.Draw(img)
        draw_eyebrow(draw, "Abraxas Protocol", int(H * 0.20), p4)
        draw_headline(draw, [
            ("Verify once.", GOLD_PALE),
            ("Reuse everywhere.", VIOLET),
        ], int(H * 0.28), p4)

        card_scale = lerp(0.85, 1.0, ease_out(scene_progress(t, 37.0, 39.0)))
        draw_passport_card(draw, W // 2, int(H * 0.48), card_scale)

        p4b = ease_out(scene_progress(t, 40.0, 42.0))
        draw_body(draw, "One proof. Every partner gets the same answer. No re-forwarding plats and IDs.", int(H * 0.64), 36, p4b)

        # Flow arrows
        if t > 43:
            arr_a = ease_out(scene_progress(t, 43.0, 44.5))
            font = load_font(FONT_MONO, 24)
            steps = ["Upload once", "→", "Passport", "→", "Any deal"]
            sx = W // 2 - 200
            for i, step in enumerate(steps):
                c = GOLD if step != "→" else CAPTION
                draw.text((sx + i * 100, int(H * 0.72)), step, font=font, fill=c if arr_a > 0.3 else BG_TOP)

    # ── Scene 5: Close (50–60s) ─────────────────────────────────
    if t >= 49.5:
        p5 = ease_out(scene_progress(t, 50.0, 51.5))
        composite_icon(img, W // 2, int(H * 0.16), 100)
        draw = ImageDraw.Draw(img)
        draw_headline(draw, [
            ("Building the trust", WHITE),
            ("layer for RWAs.", GOLD_PALE),
        ], int(H * 0.26), p5)

        p5b = ease_out(scene_progress(t, 52.0, 54.0))
        font = load_font(FONT_INTER_BOLD, 52)
        draw.text((W // 2, int(H * 0.40)), "abraxasworld.xyz", font=font, fill=GOLD, anchor="mm")

        # CTA pill
        pill_y = int(H * 0.48)
        draw.rounded_rectangle([W // 2 - 280, pill_y - 36, W // 2 + 280, pill_y + 36], radius=999, fill=GOLD)
        draw.text((W // 2, pill_y), "Enter Abraxas →", font=load_font(FONT_INTER_BOLD, 34), fill=DARK_BTN, anchor="mm")

        p5c = ease_out(scene_progress(t, 54.0, 56.0))
        draw_body(draw, "Browse the registry free · Passport unlocks full diligence", int(H * 0.56), 32, p5c)

    # Captions bar (always on for silent viewing)
    caption = caption_for_time(t)
    if caption:
        bar_h = 120
        overlay = Image.new("RGBA", (W, bar_h), (0, 0, 0, 160))
        img.paste(overlay, (0, H - bar_h - 80), overlay)
        draw = ImageDraw.Draw(img)
        draw.text((W // 2, H - bar_h // 2 - 80), caption, font=load_font(FONT_INTER_SEMI, 32), fill=WHITE, anchor="mm")

    return img


def caption_for_time(t: float) -> str:
    if t < 7:
        return "Today we onboarded another land partner — nearly $2M in assets."
    if t < 22:
        return "The cost isn't the docs. It's sending the same records to every party."
    if t < 31:
        return "Crypto had repeated KYC. RWAs have had this problem all along."
    if t < 45:
        return "Abraxas: Verify once. Reuse everywhere."
    return "Building the trust layer for real-world assets · abraxasworld.xyz"


def write_post_copy() -> None:
    copy = """# Abraxas X Launch — Post Copy

## Main post (attach video)

Today we onboarded another land partner representing nearly $2M in assets.

The biggest takeaway wasn't the asset value.

It was realizing how much time gets wasted sending the same deeds, surveys, ownership records, and supporting documents to every new counterparty.

We saw the same pattern in crypto with repeated KYC.

Real-world assets have been dealing with this problem all along.

That's what Abraxas is solving.

**Verify once. Reuse everywhere.**

Building the trust layer for real-world assets.

https://abraxasworld.xyz

---

## Shorter caption (optional)

Another land partner onboarded (~$2M assets).

The real cost wasn't the docs — it was sending the *same* deeds, surveys, and records to every new party.

Abraxas fixes it for RWAs.

Verify once. Reuse everywhere.

https://abraxasworld.xyz

---

## Files

- `abraxas-x-demo-9x16.mp4` — 60s vertical (1080×1920) for X mobile feed
- `abraxas-x-demo-16x9.mp4` — 60s horizontal (1920×1080) alternate
- `abraxas-x-demo-thumbnail.png` — meme-style thumbnail for video poster
"""
    (OUT_DIR / "X-POST-COPY.md").write_text(copy)


def render_thumbnail(bg: Image.Image) -> None:
    t = 38.0  # solution frame
    frame = render_frame(t, bg)
    thumb = frame.copy()
    thumb = thumb.resize((1200, 675), Image.Resampling.LANCZOS)  # 16:9 thumbnail
    thumb.save(OUT_DIR / "abraxas-x-demo-thumbnail.png", quality=95)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if FRAMES_DIR.exists():
        shutil.rmtree(FRAMES_DIR)
    FRAMES_DIR.mkdir(parents=True)

    total_frames = FPS * DURATION_S
    print(f"Rendering {total_frames} frames at {W}x{H}…")
    bg = make_bg()

    for i in range(total_frames):
        t = i / FPS
        frame = render_frame(t, bg)
        frame.save(FRAMES_DIR / f"frame_{i:05d}.png", optimize=True)
        if i % 90 == 0:
            print(f"  {i}/{total_frames} ({100 * i // total_frames}%)")

    vertical_mp4 = OUT_DIR / "abraxas-x-demo-9x16.mp4"
    cmd_v = [
        "ffmpeg", "-y", "-framerate", str(FPS),
        "-i", str(FRAMES_DIR / "frame_%05d.png"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-crf", "20", "-preset", "medium",
        "-movflags", "+faststart",
        str(vertical_mp4),
    ]
    subprocess.run(cmd_v, check=True, capture_output=True)

    # Horizontal crop/rescale version for desktop X
    horizontal_mp4 = OUT_DIR / "abraxas-x-demo-16x9.mp4"
    cmd_h = [
        "ffmpeg", "-y", "-i", str(vertical_mp4),
        "-vf", "crop=1080:608:0:656,scale=1920:1080",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20",
        "-movflags", "+faststart",
        str(horizontal_mp4),
    ]
    subprocess.run(cmd_h, check=True, capture_output=True)

    render_thumbnail(bg)
    write_post_copy()

    shutil.rmtree(FRAMES_DIR)

    v_size = vertical_mp4.stat().st_size / 1024 / 1024
    print(f"\nDone.")
    print(f"  Vertical:   {vertical_mp4} ({v_size:.1f} MB)")
    print(f"  Horizontal: {horizontal_mp4}")
    print(f"  Thumbnail:  {OUT_DIR / 'abraxas-x-demo-thumbnail.png'}")
    print(f"  Post copy:  {OUT_DIR / 'X-POST-COPY.md'}")


if __name__ == "__main__":
    main()
