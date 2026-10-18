#!/usr/bin/env python3
"""Dev-only: render tamga SVGs and hand-built kilim motifs into braille rows.

Writes data/motifs.json, which the `tengri --tamga` animation reads at runtime.
Needs macOS (qlmanage renders the SVGs) and Pillow. Run from the repo root:

    python3 scripts/build-motifs.py
"""
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
W, H = 64, 48  # dots -> 32 columns x 12 rows of braille cells
BITS = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]]

# id, Turkish name, English name, svg file, credit
TAMGAS = [
    ("ashina", "Aşina damgası", "Ashina clan", "docs/ashina-tamga.svg", "Sebirkhan, CC0"),
    ("kayi", "Kayı boyu damgası", "Kayı tribe", "docs/tamgas/kayi-2.svg", "SAİT71, public domain"),
    ("kipchak", "Kıpçak damgası", "Kipchak", "docs/tamgas/kipchak.svg", "Devlet Geray, CC0"),
    ("kereyit", "Kereyit damgası", "Kereyit", "docs/tamgas/kereyit.svg", "Devlet Geray, CC0"),
    ("qirq", "Kırk damgası", "Qırq", "docs/tamgas/qirq.svg", "Devlet Geray, CC0"),
    ("qiyat", "Kıyat damgası", "Qıyat", "docs/tamgas/qiyat.svg", "Devlet Geray, CC0"),
    ("qonrat", "Konrat damgası", "Qoñrat", "docs/tamgas/qonrat.svg", "Devlet Geray, CC0"),
    ("barin", "Barın damgası", "Barın", "docs/tamgas/barin.svg", "Devlet Geray, CC0"),
    ("giray", "Giray damgası", "Giray dynasty", "docs/tamgas/giray.svg", "Devlet Geray, CC0"),
]


def to_braille(mask):
    """mask: H x W list of 0/1 rows -> list of braille strings."""
    rows = []
    for cy in range(0, H, 4):
        line = ""
        for cx in range(0, W, 2):
            bits = 0
            for dy in range(4):
                for dx in range(2):
                    if mask[cy + dy][cx + dx]:
                        bits |= BITS[dy][dx]
            line += chr(0x2800 + bits)
        rows.append(line)
    return rows


def render_svg(path):
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["qlmanage", "-t", "-s", "600", "-o", tmp, str(path)], check=True, capture_output=True)
        png = next(Path(tmp).glob("*.png"))
        img = Image.open(png).convert("RGBA")
        white = Image.new("RGBA", img.size, (255, 255, 255, 255))
        rgb = Image.alpha_composite(white, img).convert("RGB")
        # ink where any channel is dark (yellow has a dark blue channel)
        dark = [c.point(lambda v: 255 if v < 140 else 0) for c in rgb.split()]
        mask = ImageChops.lighter(ImageChops.lighter(dark[0], dark[1]), dark[2])
        return mask


def fit(mask):
    box = mask.getbbox()
    assert box, "empty mask"
    mask = mask.crop(box)
    scale = min((W - 4) / mask.width, (H - 4) / mask.height)
    w, h = max(1, round(mask.width * scale)), max(1, round(mask.height * scale))
    mask = mask.resize((w, h), Image.LANCZOS)
    canvas = Image.new("L", (W, H), 0)
    canvas.paste(mask, ((W - w) // 2, (H - h) // 2))
    px = canvas.load()
    return [[1 if px[x, y] > 100 else 0 for x in range(W)] for y in range(H)]


# --- kilim motifs: drawn on a 16x16 grid, scaled x3 -------------------------

N = 16
C = (N - 1) / 2


def grid(fn):
    return [[1 if fn(x, y) else 0 for x in range(N)] for y in range(N)]


def thick_path(points, r=1.1):
    def fn(x, y):
        for (x1, y1), (x2, y2) in zip(points, points[1:]):
            dx, dy = x2 - x1, y2 - y1
            t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
            if (x - x1 - t * dx) ** 2 + (y - y1 - t * dy) ** 2 <= r * r:
                return True
        return False

    return fn


def eye(x, y):
    d = abs(x - C) + abs(y - C)
    if d > 7.6:
        return False
    holes = [(7.5, 7.5, 1.2), (3.5, 7.5, 0.8), (11.5, 7.5, 0.8), (7.5, 3.5, 0.8), (7.5, 11.5, 0.8)]
    return not any(abs(x - hx) <= hr and abs(y - hy) <= hr for hx, hy, hr in holes)


def comb(x, y):
    if y <= 4:
        return x % 2 == 1 and 1 <= x <= 14
    if y <= 7:
        return True
    if y <= 14:
        return abs(x - C) <= 7.5 - (y - 7) * 0.75
    return False


def hourglass(x, y):
    top = y <= 7
    half = (7.5 - (y if top else N - 1 - y)) + 0.5
    return abs(x - C) <= half


def amulet(x, y):
    if y > 11:
        return y >= 13 and x % 2 == 0
    outer = abs(x - C) <= (y + 0.6) * (7.5 / 11.6)
    inner = y >= 4 and abs(x - C) <= (y - 3.0) * (7.5 / 11.6) * 0.62
    core = y >= 7 and abs(x - C) <= (y - 6.0) * 0.45
    return (outer and not inner) or core


def star(x, y):
    dx, dy = abs(x - C), abs(y - C)
    return dx + dy <= 6.3 or (dx <= 1.2 and dy <= 7.6) or (dy <= 1.2 and dx <= 7.6)


def horns(x, y):
    left = [(7, 13), (4, 12), (2, 9), (2, 5), (4, 2.5), (6, 3), (6, 5.5)]
    right = [(N - 1 - px, py) for px, py in left]
    return thick_path(left, 0.95)(x, y) or thick_path(right, 0.95)(x, y)


MOTIFS = [
    ("goz", "Göz", "Eye", eye),
    ("tarak", "Tarak", "Comb", comb),
    ("kum-saati", "Kum saati", "Hourglass", hourglass),
    ("tilsim", "Tılsım", "Amulet", amulet),
    ("yildiz", "Yıldız", "Star", star),
    ("koc-boynuzu", "Koç boynuzu", "Ram's horn", horns),
]


def upscale(cells):
    f = H // N
    left = (W - N * f) // 2
    return [[cells[y // f][(x - left) // f] if 0 <= x - left < N * f else 0 for x in range(W)] for y in range(H)]


def main():
    out = []
    for id_, tr, en, svg, credit in TAMGAS:
        mask = fit(render_svg(ROOT / svg))
        out.append({"id": id_, "kind": "tamga", "tr": tr, "en": en, "credit": credit, "rows": to_braille(mask)})
    for id_, tr, en, fn in MOTIFS:
        out.append({"id": id_, "kind": "kilim", "tr": tr, "en": en, "credit": "traditional motif, drawn for tengri",
                    "rows": to_braille(upscale(grid(fn)))})
    (ROOT / "data" / "motifs.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    for m in out:
        print(f"{m['id']:12} {m['tr']}")
        print("\n".join("  " + r for r in m["rows"]))


if __name__ == "__main__":
    main()
