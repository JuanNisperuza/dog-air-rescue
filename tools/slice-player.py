"""Corta las hojas del perrito piloto (fondo magenta, cuadrícula 4x4) en frames.

Todos los frames se alinean por el centro del avión amarillo y se escalan para que el
avión mida lo mismo en todas las hojas; así no "tiembla" al cambiar de animación.
Requiere Pillow, numpy y scipy. Después: npm run atlas -- dog_plane
Uso: python tools/slice-player.py
"""
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'art/source'
OUT = 'art/frames/dog'
PREFIX = 'dog_plane_'
PLANE_WIDTH = 128        # ancho del avión en el frame final (px)
KEY_SOLID, KEY_CLEAR = 70, 150

# animación: (hoja, tamaño de celda, [(fila, columna), ...])
def row(r, cols=range(4)):
    return [(r, c) for c in cols]

ANIMATIONS = {
    'idle': ('player_fly', 512, row(0) + row(1) + row(2) + row(3)),
    'happy':         ('player_happy', 512, row(1) + row(2)),
    'hurt':          ('player_shoot_hurt', 256, row(1)),
    'super':         ('player_super', 512, row(0) + row(1) + row(2) + row(3, range(3))),
}


def key_out(rgb):
    """Quita el magenta tratando cada píxel como mezcla de dibujo + fondo.

    Así lo semitransparente (la hélice borrosa, el humo) queda blanco/gris y no rosado.
    """
    a = rgb.astype(np.float32)
    bg = np.median(np.concatenate([a[:4, :4].reshape(-1, 3), a[-4:, -4:].reshape(-1, 3)]), axis=0)
    bg_key = max(1.0, min(bg[0], bg[2]) - bg[1])
    key = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]
    alpha = np.clip(1 - (key - 12) / (bg_key - 12), 0, 1)
    safe = np.maximum(alpha, 0.05)[..., None]
    color = np.where((alpha < 0.999)[..., None], (a - (1 - safe) * bg) / safe, a)
    out = np.dstack([color, alpha * 255]).clip(0, 255).astype(np.uint8)
    out[..., 3][out[..., 3] < 24] = 0
    return out


def clean(rgba, min_area=40):
    """Quita ruido suelto y las líneas oscuras de la cuadrícula en los bordes."""
    mask = rgba[..., 3] > 40
    lab, n = ndimage.label(mask)
    if n:
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        keep = np.concatenate([[False], sizes >= min_area])
        rgba = rgba.copy()
        rgba[..., 3] = np.where(ndimage.binary_dilation(keep[lab], iterations=2), rgba[..., 3], 0)
    return rgba


def plane_mask(rgba):
    a = rgba.astype(int)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    return (al > 200) & (r > 170) & (g > 120) & (r - b > 70) & (g - b > 40)


def load_frames():
    sheets = {}
    frames = []
    for anim, (sheet, cell, cells) in ANIMATIONS.items():
        if sheet not in sheets:
            sheets[sheet] = Image.open(f'{SRC}/{sheet}.jpeg').convert('RGB')
        img = sheets[sheet]
        inset = max(6, cell // 50)
        for i, (r, c) in enumerate(cells, 1):
            box = (c * cell + inset, r * cell + inset, (c + 1) * cell - inset, (r + 1) * cell - inset)
            rgba = clean(key_out(np.array(img.crop(box))))
            mask = plane_mask(rgba)
            ys, xs = np.nonzero(mask)
            width = np.percentile(xs, 98) - np.percentile(xs, 2)
            frames.append({'name': f'{PREFIX}{anim}_{i:04d}', 'rgba': rgba, 'width': width,
                           'anchor': (np.median(xs), np.median(ys)), 'sheet': sheet})
    return frames


def main():
    frames = load_frames()

    # Una escala por hoja (el avión puede salir de distinto tamaño en cada una)
    scale = {}
    for sheet in {f['sheet'] for f in frames}:
        widths = [f['width'] for f in frames if f['sheet'] == sheet]
        scale[sheet] = PLANE_WIDTH / float(np.median(widths))

    scaled = []
    for f in frames:
        s = scale[f['sheet']]
        im = Image.fromarray(f['rgba'], 'RGBA')
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        ax, ay = f['anchor'][0] * s, f['anchor'][1] * s
        scaled.append((f['name'], im, int(round(ax)), int(round(ay))))

    left = max(ax for _, _, ax, _ in scaled)
    top = max(ay for _, _, _, ay in scaled)
    right = max(im.width - ax for _, im, ax, _ in scaled)
    bottom = max(im.height - ay for _, im, _, ay in scaled)
    W, H = left + right, top + bottom

    os.makedirs(OUT, exist_ok=True)
    for name, im, ax, ay in scaled:
        canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        canvas.alpha_composite(im, (left - ax, top - ay))
        canvas.save(f'{OUT}/{name}.png')

    info = {'canvas': [W, H], 'center': [left, top]}
    print(json.dumps(info))
    with open(f'{OUT}/_layout.json', 'w') as fp:
        json.dump(info, fp)


if __name__ == '__main__':
    main()
