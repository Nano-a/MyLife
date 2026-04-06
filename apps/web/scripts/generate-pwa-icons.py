#!/usr/bin/env python3
"""Génère les PNG PWA (écran d’accueil / manifest) pour MyLife."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public"
SIZES = (32, 180, 192, 512)

FILL_TOP = (124, 58, 237)  # #7c3aed
FILL_BOT = (91, 33, 182)  # #5b21b6


def _truetype(size_px: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    font_px = max(int(round(size_px * 0.44)), 10)
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for p in candidates:
        if os.path.isfile(p):
            try:
                return ImageFont.truetype(p, font_px)
            except OSError:
                continue
    return ImageFont.load_default()


def make_icon(size: int) -> Image.Image:
    pad = max(2, int(round(size * 0.06)))
    rad = max(8, int(round(size * 0.19)))

    grad = Image.new("RGBA", (size, size))
    gpx = grad.load()
    for y in range(size):
        t = y / max(size - 1, 1)
        r = int(FILL_TOP[0] + (FILL_BOT[0] - FILL_TOP[0]) * t)
        g = int(FILL_TOP[1] + (FILL_BOT[1] - FILL_TOP[1]) * t)
        b = int(FILL_TOP[2] + (FILL_BOT[2] - FILL_TOP[2]) * t)
        for x in range(size):
            gpx[x, y] = (r, g, b, 255)

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [pad, pad, size - pad - 1, size - pad - 1],
        radius=rad,
        fill=255,
    )

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.paste(grad, (0, 0), mask)

    draw = ImageDraw.Draw(img)
    font = _truetype(size)
    text = "M"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    ox = (size - tw) // 2 - bbox[0]
    oy = (size - th) // 2 - bbox[1] - max(1, int(size * 0.025))
    draw.text((ox, oy), text, font=font, fill=(255, 255, 255, 255))

    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for s in SIZES:
        path = OUT / f"icon-{s}.png"
        make_icon(s).save(path, format="PNG", optimize=True)
        print("wrote", path)


if __name__ == "__main__":
    main()
