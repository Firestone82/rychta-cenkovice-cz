#!/usr/bin/env python3
"""Builds the handful of hand-picked editorial images that ship with the frontend
(hero, seasons, trip thumbnails) from the original photos.

Usage: python3 tools/make-static-images.py <folder with the original userFiles tree>
Needs Pillow. The gallery and apartment photos are NOT handled here: those live in
the API (rychta-api import-photos).
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageOps

SRC = Path(sys.argv[1])
OUT = Path(__file__).resolve().parent.parent / "web" / "public" / "img"
OUT.mkdir(parents=True, exist_ok=True)
MANIFEST = Path(__file__).resolve().parent.parent / "web" / "src" / "content" / "images.json"
built = {}

def crop(img, ratio, fx=0.5, fy=0.5):
    w, h = img.size
    if w / h > ratio:
        nw = int(h * ratio)
        x = min(max(int(w * fx - nw / 2), 0), w - nw)
        return img.crop((x, 0, x + nw, h))
    nh = int(w / ratio)
    y = min(max(int(h * fy - nh / 2), 0), h - nh)
    return img.crop((0, y, w, y + nh))

def build(name, source, ratio, widths, fx=0.5, fy=0.5, quality=78, min_width=320):
    img = ImageOps.exif_transpose(Image.open(SRC / source)).convert("RGB")
    img = crop(img, ratio, fx, fy)
    if img.size[0] < min_width:
        print(f"skipped {name}: the original is only {img.size[0]} px wide")
        return
    for old in OUT.glob(f"{name}-*.webp"):
        old.unlink()
    sizes = sorted({min(w, img.size[0]) for w in widths})
    for w in sizes:
        out = img.resize((w, round(w / ratio)), Image.LANCZOS)
        out.save(OUT / f"{name}-{w}.webp", "WEBP", quality=quality, method=6)
    built[name] = (sizes, round(sizes[0] / ratio))
    print(name, sizes)

# Hero: one photo per season, portrait 4:5 (shown inside the gable-shaped window).
HERO = {
    "winter": ("zima/zima-bukovka7.jpg", 0.42, 0.5),
    "spring": ("fotky-okoli-rychty/jaro-pod-skalou.jpg", 0.70, 0.5),
    "summer": ("galerie/005.jpg", 0.30, 0.5),
    "autumn": ("fotky-okoli-rychty/kravy-podzim.jpg", 0.70, 0.5),
}
for season, (src, fx, fy) in HERO.items():
    build(f"hero-{season}", src, 4 / 5, [640, 1200], fx, fy)

# Seasons on the "things to do" page, landscape 3:2.
SEASONS = {
    "winter": ("bukovka.jpg", 0.5, 0.5),
    "spring": ("fotky-okoli-rychty/bledule-2.jpg", 0.5, 0.55),
    "summer": ("vylety/louka.jpg", 0.5, 0.6),
    "autumn": ("vylety/muchomurky.jpg", 0.5, 0.6),
}
for season, (src, fx, fy) in SEASONS.items():
    build(f"season-{season}", src, 3 / 2, [640, 1200], fx, fy)

# Trip thumbnails, 4:3.
TRIPS = {
    "litomysl": "vylety/litomysl.jpg",
    "neratov": "vylety/neratov-2.jpg",
    "zemska-brana": "vylety/zemska-brana.jpg",
    "dolni-morava": "vylety/dolni-morava-stezka.jpeg",
    "hedec": "hedec.jpg",
    "jablonne": "vylety/jablonne.jpg",
    "suchy-vrch": "vylety/podzim-suchac.jpg",
    "bukova-hora": "zima/zima-sjezdovky.jpg",
    "bouda": "vylety/bouda.jpg",
    "hurka": "hurka.jpg",
    "castolovice": "vylety/castalovice-2.jpg",
}
for name, src in TRIPS.items():
    build(f"trip-{name}", src, 4 / 3, [480, 960])

# The original site only has small versions of these, shown below their thumbnail size.
SMALL_TRIPS = {
    "krizova-hora": ("vylety/krizova-hora.jpg", 0.5),
    "zamberk": ("vylety/zamberk-park.jpg", 0.72),
}
for name, (src, fy) in SMALL_TRIPS.items():
    build(f"trip-{name}", src, 4 / 3, [480], fy=fy, min_width=160)

# Wide images: the house from the air (video poster, social preview) and the village.
build("house-aerial", "galerie/001.jpg", 16 / 9, [960, 1920])
build("village", "galerie/004.jpg", 16 / 9, [960, 1920])
build("house-winter", "img/i3.jpg", 16 / 9, [960])
img = ImageOps.exif_transpose(Image.open(SRC / "galerie/005.jpg")).convert("RGB")
crop(img, 1200 / 630, 0.4, 0.5).resize((1200, 630), Image.LANCZOS).save(OUT / "og-image.jpg", "JPEG", quality=84)

# The frontend reads the available widths from this generated file.
manifest = {name: {"widths": built[name][0], "height": built[name][1]} for name in sorted(built)}
MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
