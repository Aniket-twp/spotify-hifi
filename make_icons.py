"""Render the "Refract" brand mark into every app icon asset.

icon.svg is the vector source of truth; this mirrors it with numpy so the
raster set (PWA icons, Android mipmaps, favicons, store art) matches it.
"""
import io
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

BASE = os.path.dirname(os.path.abspath(__file__))
SS = 4          # supersample factor for clean edges
D = 512         # design grid
R_TILE = 116    # squircle corner radius on the design grid

TILE = [(0.00, (0x21, 0x28, 0x40)), (0.50, (0x0D, 0x11, 0x20)), (1.00, (0x05, 0x06, 0x0B))]
WAVE = [(0.00, (0x5E, 0xE7, 0xFF)), (0.42, (0x8F, 0x7B, 0xFF)), (0.78, (0xFF, 0x4D, 0x7E)), (1.00, (0xFF, 0xD6, 0x0A))]
BARS = [(150, 222, 26, 68), (196, 186, 26, 140), (242, 150, 26, 212), (288, 196, 26, 120), (334, 228, 26, 56)]
LENS_R = 148.0
WHITE = np.array([255.0, 255.0, 255.0], np.float32)


def grid(n):
    return np.meshgrid(np.arange(n, dtype=np.float32), np.arange(n, dtype=np.float32))


def ramp(t, stops):
    t = np.clip(t, 0.0, 1.0)
    chans = len(stops[0][1])
    out = np.zeros(t.shape + (chans,), np.float32)
    for c in range(chans):
        pts = [(s, v[c]) for s, v in stops]
        vals = np.full_like(t, pts[0][1])
        for i in range(len(pts) - 1):
            (s0, v0), (s1, v1) = pts[i], pts[i + 1]
            f = np.clip((t - s0) / max(s1 - s0, 1e-6), 0, 1)
            vals = np.where((t >= s0) & (t <= s1), v0 + (v1 - v0) * f, vals)
        out[..., c] = np.where(t > pts[-1][0], pts[-1][1], vals)
    return out


def diag(n, stops):
    x, y = grid(n)
    return ramp((x + y) / (2 * (n - 1)), stops)


def radial(n, cx, cy, r, stops):
    x, y = grid(n)
    k = n / D
    return ramp(np.hypot(x - cx * k, y - cy * k) / (r * k), stops)


def blob(n, cx_pct, cy_pct, r_pct, col, power=2.2, gain=0.3):
    x, y = grid(n)
    d = np.hypot(x - cx_pct * n / 100, y - cy_pct * n / 100) / (r_pct * n / 100)
    return np.clip(1 - d, 0, 1) ** power * gain, np.array(col, np.float32)


def rr_mask(n, radius=R_TILE, inset=0.0):
    m = Image.new("L", (n, n), 0)
    k = n / D
    ImageDraw.Draw(m).rounded_rectangle(
        [inset * k, inset * k, n - 1 - inset * k, n - 1 - inset * k],
        radius=max(int((radius - inset) * k), 0), fill=255)
    return np.asarray(m, np.float32) / 255.0


def circ(n, cx, cy, r):
    x, y = grid(n)
    k = n / D
    return np.clip(r * k - np.hypot(x - cx * k, y - cy * k) + 0.5, 0, 1)


def ring(n, cx, cy, r, w):
    return circ(n, cx, cy, r + w / 2) - circ(n, cx, cy, r - w / 2)


def bars(n):
    m = Image.new("L", (n, n), 0)
    dr = ImageDraw.Draw(m)
    k = n / D
    for x, y, w, h in BARS:
        dr.rounded_rectangle([x * k, y * k, (x + w) * k, (y + h) * k], radius=13 * k, fill=255)
    return np.asarray(m, np.float32) / 255.0


def blur(a, sigma):
    """Gaussian-blur a float alpha field via PIL."""
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(sigma))
    return np.asarray(im, np.float32) / 255.0


def spec(n):
    """Crescent rim-light hugging the top-left of the lens, plus a hot spot."""
    k = n / D
    cres = (circ(n, 256, 256, LENS_R) - circ(n, 256 + 26, 256 + 30, LENS_R - 4)).clip(0, 1)
    cres = blur(cres, n * 0.008)
    x, y = grid(n)
    # keep the crescent on the upper-left quadrant only
    ang = np.clip((256 - x) / (LENS_R * k) * 0.7 + (256 - y) / (LENS_R * k) * 0.7, 0, 1)
    cres = cres * np.clip(ang, 0, 1) ** 1.2
    hot = blur(np.clip(1 - np.hypot(x - 196 * k, y - 172 * k) / (26 * k), 0, 1) ** 2.4, n * 0.004)
    return np.clip(cres * 0.85 + hot * 0.55, 0, 1)


def wave_t(n):
    """Ramp parameter across the waveform bounding box: cyan low-left -> gold high-right."""
    x, y = grid(n)
    k = n / D
    tx = np.clip((x - 150 * k) / (210 * k), 0, 1)
    ty = np.clip((362 * k - y) / (212 * k), 0, 1)
    return 0.66 * tx + 0.34 * ty


def chroma(n, wm, dx, col, gain):
    """Faint dispersion fringe so the bars read as light through glass."""
    k = n / D
    sx = int(round(dx * k))
    sy = int(round(-dx * k))
    a = np.roll(np.roll(wm, sy, axis=0), sx, axis=1)
    return over(np.zeros((n, n, 3), np.float32), np.array(col, np.float32), a * gain), a * gain


def over(dst, src, alpha):
    return dst * (1 - alpha[..., None]) + src * alpha[..., None]


def mark_rgb(n, bg=None):
    """Full-bleed mark: halo + glass lens + refracted waveform + rims."""
    rgb = diag(n, TILE) if bg is None else bg.copy()

    # 1. light leaking out of the orb
    halo = radial(n, 256, 256, LENS_R * 1.75, [(0.0, (0.55,)), (0.55, (0.16,)), (1.0, (0.0,))])[..., 0]
    rgb = over(rgb, np.array([96, 118, 232], np.float32), halo * 0.85)

    # 2. the lens itself: cool glass, brighter at the light source
    lens_col = radial(n, 208, 200, LENS_R * 1.5,
                      [(0.0, (150., 170., 235.)), (0.45, (54., 66., 108.)), (1.0, (10., 13., 24.))])
    rgb = over(rgb, lens_col, circ(n, 256, 256, LENS_R) * 0.92)

    # 3. waveform, gradient mapped across its own box, with dispersion fringes
    wm = bars(n) * circ(n, 256, 256, LENS_R - 1)
    wave = ramp(wave_t(n), WAVE)
    glow = np.asarray(
        Image.fromarray(np.dstack([wave.astype(np.uint8), (wm * 255).astype(np.uint8)]), "RGBA")
        .filter(ImageFilter.GaussianBlur(n * 0.018)), np.float32)
    rgb = over(rgb, glow[..., :3], (glow[..., 3] / 255.0) * 0.85)
    _, ca = chroma(n, wm, 3.0, (0, 240, 255), 0.30)
    rgb = over(rgb, np.array([0, 240, 255], np.float32), ca)
    _, cb = chroma(n, wm, -3.0, (255, 60, 150), 0.26)
    rgb = over(rgb, np.array([255, 60, 150], np.float32), cb)
    rgb = over(rgb, wave, wm)

    # 4. rims: bright refracted edge + soft crescent highlight
    rim_a = diag(n, [(0.0, (0.85,)), (0.30, (0.16,)), (0.70, (0.10,)), (1.0, (0.55,))])[..., 0]
    rgb = over(rgb, WHITE, ring(n, 256, 256, LENS_R, 4.5) * rim_a)
    rgb = over(rgb, WHITE, spec(n))

    # 5. tile hairline
    rgb = over(rgb, WHITE, (rr_mask(n) - rr_mask(n, inset=6.5)).clip(0, 1) * 0.14)
    return np.clip(rgb, 0, 255)


def render(n, mode, scale=1.0):
    """Return an n x n RGBA uint array for the given asset mode."""
    if mode == "tile":
        return np.dstack([mark_rgb(n), rr_mask(n) * 255]).astype(np.uint8)

    if mode == "maskable":
        base = diag(n, TILE)
        art = mark_rgb(n)
        k = int(n * scale)
        small = np.asarray(Image.fromarray(art.astype(np.uint8), "RGB").resize((k, k), Image.LANCZOS), np.float32)
        pad = (n - k) // 2
        box = np.zeros((n, n, 3), np.float32)
        box[pad:pad + k, pad:pad + k] = small
        sel = np.zeros((n, n), np.float32)
        sel[pad:pad + k, pad:pad + k] = 1
        return np.dstack([np.where(sel[..., None] > 0, box, base), np.full((n, n), 255.0, np.float32)]).astype(np.uint8)

    if mode == "splash":
        bg = diag(n, [(0.0, (0x17, 0x1C, 0x31)), (0.5, (0x0A, 0x0C, 0x16)), (1.0, (0x04, 0x05, 0x09))])
        for cx, cy, r, col in [(20, 16, 44, (94, 231, 255)), (84, 24, 38, (255, 77, 126)), (52, 92, 46, (143, 123, 255))]:
            a, colv = blob(n, cx, cy, r, col)
            bg = over(bg, colv, a)
        art = mark_rgb(n)
        k = int(n * 0.42)
        pad = (n - k) // 2
        small = Image.fromarray(np.dstack([art.astype(np.uint8), (rr_mask(n) * 255).astype(np.uint8)]), "RGBA")
        small = small.resize((k, k), Image.LANCZOS)
        # soft drop shadow
        sh = Image.new("L", (n, n), 0)
        ImageDraw.Draw(sh).rounded_rectangle(
            [pad, pad + int(k * 0.06), pad + k, pad + k + int(k * 0.06)], radius=int(k * 0.22), fill=170)
        sh = sh.filter(ImageFilter.GaussianBlur(n * 0.016))
        out = Image.fromarray(np.dstack([bg.astype(np.uint8), np.full((n, n), 255, np.uint8)]), "RGBA")
        shadow_layer = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        shadow_layer.paste((0, 0, 0, 220), mask=sh)
        out = Image.alpha_composite(out, shadow_layer)
        out.paste(small, (pad, pad), small)
        return np.asarray(out, np.uint8)

    raise ValueError(mode)


def fg_rgba(n):
    """The mark on a transparent canvas, for Android adaptive-icon foregrounds."""
    rgb = np.zeros((n, n, 3), np.float32)
    a = np.zeros((n, n), np.float32)

    def put(src_rgb, src_a):
        nonlocal rgb, a
        na = src_a + a * (1 - src_a)
        safe = np.maximum(na, 1e-6)[..., None]
        rgb = (src_a[..., None] * src_rgb + (1 - src_a)[..., None] * a[..., None] * rgb) / safe
        rgb = np.where(na[..., None] > 0, rgb, 0)
        a = na

    halo = radial(n, 256, 256, LENS_R * 1.75, [(0.0, (0.55,)), (0.55, (0.16,)), (1.0, (0.0,))])[..., 0]
    put(np.array([96, 118, 232], np.float32), halo * 0.85)

    lens_col = radial(n, 208, 200, LENS_R * 1.5,
                      [(0.0, (150., 170., 235.)), (0.45, (54., 66., 108.)), (1.0, (10., 13., 24.))])
    put(lens_col, circ(n, 256, 256, LENS_R) * 0.92)

    wm = bars(n) * circ(n, 256, 256, LENS_R - 1)
    wave = ramp(wave_t(n), WAVE)
    glow = np.asarray(
        Image.fromarray(np.dstack([wave.astype(np.uint8), (wm * 255).astype(np.uint8)]), "RGBA")
        .filter(ImageFilter.GaussianBlur(n * 0.018)), np.float32)
    put(glow[..., :3], (glow[..., 3] / 255.0) * 0.85)
    _, ca = chroma(n, wm, 3.0, (0, 240, 255), 0.30)
    put(np.array([0, 240, 255], np.float32), ca)
    _, cb = chroma(n, wm, -3.0, (255, 60, 150), 0.26)
    put(np.array([255, 60, 150], np.float32), cb)
    put(wave, wm)

    rim_a = diag(n, [(0.0, (0.85,)), (0.30, (0.16,)), (0.70, (0.10,)), (1.0, (0.55,))])[..., 0]
    put(WHITE, ring(n, 256, 256, LENS_R, 4.5) * rim_a)
    put(WHITE, spec(n))
    return np.dstack([np.clip(rgb, 0, 255), np.clip(a, 0, 1) * 255]).astype(np.uint8)


def adaptive_fg(size, cover=0.84, ss=SS):
    """108dp adaptive canvas with the mark inside the 66dp safe zone."""
    n = size * ss
    art = Image.fromarray(fg_rgba(n), "RGBA")
    k = int(n * cover)
    art = art.resize((k, k), Image.LANCZOS)
    pad = (n - k) // 2
    off = int(k * 0.05)
    shadow = Image.new("L", (k, k), 0)
    ImageDraw.Draw(shadow).ellipse([k * 0.10, k * 0.16 + off, k * 0.90, k * 0.96 + off], fill=150)
    shadow = shadow.filter(ImageFilter.GaussianBlur(k * 0.05))
    canvas = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    black = Image.new("RGBA", (k, k), (0, 0, 0, 160))
    canvas.paste(black, (pad, pad), shadow)
    canvas.paste(art, (pad, pad), art)
    return canvas.resize((size, size), Image.LANCZOS)


ADAPTIVE_XML = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>
"""

BACKGROUND_XML = """<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp"
    android:viewportWidth="108" android:viewportHeight="108">
    <path android:pathData="M0,0h108v108h-108z">
        <aapt:attr xmlns:aapt="http://schemas.android.com/aapt" name="android:fillColor">
            <gradient android:type="linear" android:startX="0" android:startY="0"
                      android:endX="108" android:endY="108">
                <item android:offset="0" android:color="#FF212840" />
                <item android:offset="0.5" android:color="#FF0D1120" />
                <item android:offset="1" android:color="#FF05060B" />
            </gradient>
        </aapt:attr>
    </path>
</vector>
"""


def write_text(rel, text):
    p = os.path.join(BASE, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with io.open(p, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    print(f"  {rel:<58} xml")


def out(size, mode, ss=SS, scale=1.0):
    return Image.fromarray(render(size * ss, mode, scale), "RGBA").resize((size, size), Image.LANCZOS)


def save(img, rel, **kw):
    p = os.path.join(BASE, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    img.save(p, **({"format": "ICO"} if "sizes" in kw else {}), **kw)
    print(f"  {rel:<58} {img.size[0]}x{img.size[1]}")


def main():
    print("Rendering brand mark ->")
    save(out(512, "tile"), "icon-512.png")
    save(out(192, "tile"), "icon-192.png")
    save(out(48, "tile"), "favicon.png")
    save(out(512, "maskable"), "icon-maskable-512.png")
    save(out(256, "tile"), "app.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (256, 256)])
    save(out(48, "tile"), "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    save(out(150, "tile"), "store-icon-150.png")
    save(out(44, "tile"), "store-icon-44.png")
    save(out(620, "splash", ss=2), "store-splash-620.png")
    for dens, px in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]:
        save(out(px, "tile"), f"android/app/src/main/res/mipmap-{dens}/ic_launcher.png")
        save(out(px, "tile"), f"android/app/src/main/res/mipmap-{dens}/ic_launcher_round.png")

    # Android 8+ adaptive icon: launcher masks it into a squircle / circle
    for dens, px in [("mdpi", 108), ("hdpi", 162), ("xhdpi", 216), ("xxhdpi", 324), ("xxxhdpi", 432)]:
        save(adaptive_fg(px), f"android/app/src/main/res/drawable-{dens}/ic_launcher_foreground.png")
        save(adaptive_fg(px, cover=0.62), f"android/app/src/main/res/drawable-{dens}/ic_launcher_monochrome.png")
    write_text("android/app/src/main/res/drawable/ic_launcher_background.xml", BACKGROUND_XML)
    write_text("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml", ADAPTIVE_XML)
    write_text("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml", ADAPTIVE_XML)
    print("done")


if __name__ == "__main__":
    main()
